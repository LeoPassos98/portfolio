import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.validation.js';
import { DatabaseService } from '../database/database.service.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';
import {
  DEMO_GENERATION_RATE_LIMIT,
  DEMO_GENERATION_WINDOW_SECONDS,
  DemoGenerationRateLimitService,
  demoOriginAdvisoryLockKey,
} from './demo-generation-rate-limit.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run DEMO rate limit tests.');
}

const originA = 'a'.repeat(64);
const originB = 'b'.repeat(64);
const testOrigins = [originA, originB];
let database: DatabaseService;
let service: DemoGenerationRateLimitService;
let admissionLocks: DemoAdmissionLockService;

async function insertAttempt(
  originIpHash: string,
  secondsAgo: number,
): Promise<void> {
  await database.$executeRaw`
    INSERT INTO "demo_generation_attempt"
      ("id", "origin_ip_hash", "created_at")
    VALUES (
      ${randomUUID()}::uuid,
      ${originIpHash},
      statement_timestamp() - make_interval(secs => ${secondsAgo})
    )
  `;
}

async function countAttempts(originIpHash: string): Promise<number> {
  return database.demoGenerationAttempt.count({ where: { originIpHash } });
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for an independent origin')),
      milliseconds,
    );

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

describe('DemoGenerationRateLimitService', () => {
  beforeAll(async () => {
    const configService = new ConfigService<Environment, true>({
      DATABASE_URL: databaseUrl,
    } as Environment);
    database = new DatabaseService(configService);
    admissionLocks = new DemoAdmissionLockService();
    service = new DemoGenerationRateLimitService(database, admissionLocks);
    await database.$connect();
  });

  beforeEach(async () => {
    await database.demoGenerationAttempt.deleteMany({
      where: { originIpHash: { in: testOrigins } },
    });
  });

  afterEach(async () => {
    await database.demoGenerationAttempt.deleteMany({
      where: { originIpHash: { in: testOrigins } },
    });
  });

  afterAll(async () => {
    await database.$disconnect();
  });

  it('allows exactly the first three attempts and blocks the fourth without inserting it', async () => {
    await expect(service.checkAndRegisterAttempt(originA)).resolves.toEqual({
      allowed: true,
      current: 1,
      limit: DEMO_GENERATION_RATE_LIMIT,
      windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
    });
    await expect(service.checkAndRegisterAttempt(originA)).resolves.toEqual({
      allowed: true,
      current: 2,
      limit: DEMO_GENERATION_RATE_LIMIT,
      windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
    });
    await expect(service.checkAndRegisterAttempt(originA)).resolves.toEqual({
      allowed: true,
      current: 3,
      limit: DEMO_GENERATION_RATE_LIMIT,
      windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
    });

    const blocked = await service.checkAndRegisterAttempt(originA);

    expect(blocked).toMatchObject({
      allowed: false,
      current: 3,
      limit: 3,
      windowSeconds: 60,
      retryAfterSeconds: expect.any(Number),
    });
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
    await expect(countAttempts(originA)).resolves.toBe(3);
  });

  it('inspects the current window without inserting an attempt', async () => {
    await insertAttempt(originA, 10);

    await expect(service.inspect(originA)).resolves.toEqual({
      allowed: true,
      current: 1,
      limit: DEMO_GENERATION_RATE_LIMIT,
      windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
    });
    await expect(countAttempts(originA)).resolves.toBe(1);
  });

  it('uses the caller transaction without opening another transaction', async () => {
    const transactionSpy = vi.spyOn(database, '$transaction');

    await database.$transaction(async (transaction) => {
      await admissionLocks.acquireOriginLock(transaction, originA);
      await expect(
        service.checkAndRegisterAttemptInTransaction(transaction, originA),
      ).resolves.toMatchObject({ allowed: true, current: 1 });
    });

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    await expect(countAttempts(originA)).resolves.toBe(1);
    transactionSpy.mockRestore();
  });

  it('acquires the origin admission lock in autonomous use', async () => {
    const lockSpy = vi.spyOn(admissionLocks, 'acquireOriginLock');

    await service.checkAndRegisterAttempt(originA);

    expect(lockSpy).toHaveBeenCalledOnce();
    expect(lockSpy).toHaveBeenCalledWith(expect.anything(), originA);
    lockSpy.mockRestore();
  });

  it('calculates retryAfterSeconds from the oldest still-valid attempt', async () => {
    await insertAttempt(originA, 43);
    await insertAttempt(originA, 20);
    await insertAttempt(originA, 1);

    const blocked = await service.checkAndRegisterAttempt(originA);
    const [expected] = await database.$queryRaw<
      Array<{ retryAfterSeconds: number }>
    >`
      SELECT GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (
          MIN("created_at") + make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
          - statement_timestamp()
        )))::integer
      ) AS "retryAfterSeconds"
      FROM "demo_generation_attempt"
      WHERE "origin_ip_hash" = ${originA}
        AND "created_at" > statement_timestamp()
          - make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
    `;

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(
        expected.retryAfterSeconds,
      );
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(
        expected.retryAfterSeconds + 1,
      );
    }
  });

  it('ignores expired records and allows a new attempt after the oldest leaves the window', async () => {
    await insertAttempt(originA, 61);
    await insertAttempt(originA, 30);
    await insertAttempt(originA, 10);

    await expect(service.checkAndRegisterAttempt(originA)).resolves.toEqual({
      allowed: true,
      current: 3,
      limit: 3,
      windowSeconds: 60,
    });
    await expect(countAttempts(originA)).resolves.toBe(4);
  });

  it('keeps rate limit windows independent between origin hashes', async () => {
    await service.checkAndRegisterAttempt(originA);
    await service.checkAndRegisterAttempt(originA);
    await service.checkAndRegisterAttempt(originA);

    await expect(
      service.checkAndRegisterAttempt(originA),
    ).resolves.toMatchObject({
      allowed: false,
    });
    await expect(service.checkAndRegisterAttempt(originB)).resolves.toEqual({
      allowed: true,
      current: 1,
      limit: 3,
      windowSeconds: 60,
    });
  });

  it('serializes concurrent attempts for one origin without exceeding the limit', async () => {
    await insertAttempt(originA, 10);
    await insertAttempt(originA, 5);

    const results = await Promise.all([
      service.checkAndRegisterAttempt(originA),
      service.checkAndRegisterAttempt(originA),
    ]);

    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
    await expect(countAttempts(originA)).resolves.toBe(3);
  });

  it('does not serialize different origins behind one global lock', async () => {
    let releaseOriginA!: () => void;
    let confirmOriginALock!: () => void;
    const originALockAcquired = new Promise<void>((resolve) => {
      confirmOriginALock = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseOriginA = resolve;
    });
    const blocker = database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          ${demoOriginAdvisoryLockKey(originA)}
        )::text
      `;
      confirmOriginALock();
      await release;
    });

    await originALockAcquired;
    let originASettled = false;
    const originAAttempt = service
      .checkAndRegisterAttempt(originA)
      .finally(() => {
        originASettled = true;
      });

    try {
      await expect(
        withTimeout(service.checkAndRegisterAttempt(originB), 2_000),
      ).resolves.toMatchObject({ allowed: true });
      expect(originASettled).toBe(false);
    } finally {
      releaseOriginA();
      await blocker;
    }

    await expect(originAAttempt).resolves.toMatchObject({ allowed: true });
  });
});
