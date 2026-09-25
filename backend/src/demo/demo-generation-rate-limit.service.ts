import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';

export { demoOriginAdvisoryLockKey } from './demo-admission-lock.service.js';

export const DEMO_GENERATION_RATE_LIMIT = 3;
export const DEMO_GENERATION_WINDOW_SECONDS = 60;

type DemoGenerationRateLimitBase = {
  current: number;
  limit: typeof DEMO_GENERATION_RATE_LIMIT;
  windowSeconds: typeof DEMO_GENERATION_WINDOW_SECONDS;
};

export type DemoGenerationRateLimitResult =
  | (DemoGenerationRateLimitBase & { allowed: true })
  | (DemoGenerationRateLimitBase & {
      allowed: false;
      retryAfterSeconds: number;
    });

type AttemptWindow = {
  current: number;
  retryAfterSeconds: number | null;
};

type DatabaseReader = DatabaseService | Prisma.TransactionClient;

@Injectable()
export class DemoGenerationRateLimitService {
  constructor(
    private readonly database: DatabaseService,
    private readonly admissionLocks: DemoAdmissionLockService,
  ) {}

  inspect(originIpHash: string): Promise<DemoGenerationRateLimitResult> {
    return this.readResult(this.database, originIpHash);
  }

  checkAndRegisterAttempt(
    originIpHash: string,
  ): Promise<DemoGenerationRateLimitResult> {
    return this.database.$transaction(async (transaction) => {
      await this.admissionLocks.acquireOriginLock(transaction, originIpHash);

      return this.checkAndRegisterAttemptInTransaction(
        transaction,
        originIpHash,
      );
    });
  }

  async checkAndRegisterAttemptInTransaction(
    transaction: Prisma.TransactionClient,
    originIpHash: string,
    referenceTime?: Date,
  ): Promise<DemoGenerationRateLimitResult> {
    const window = await this.readAttemptWindow(
      transaction,
      originIpHash,
      referenceTime,
    );
    const result = this.toResult(window);

    if (!result.allowed) return result;

    if (referenceTime) {
      const referenceTimeEpochMs = referenceTime.getTime();
      await transaction.$executeRaw`
        INSERT INTO "demo_generation_attempt" (
          "id",
          "origin_ip_hash",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${originIpHash},
          to_timestamp(${referenceTimeEpochMs} / 1000.0)
        )
      `;
    } else {
      await transaction.$executeRaw`
        INSERT INTO "demo_generation_attempt" (
          "id",
          "origin_ip_hash",
          "created_at"
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${originIpHash},
          statement_timestamp()
        )
      `;
    }

    return {
      ...result,
      current: result.current + 1,
    };
  }

  private async readResult(
    database: DatabaseReader,
    originIpHash: string,
  ): Promise<DemoGenerationRateLimitResult> {
    const window = await this.readAttemptWindow(database, originIpHash);

    return this.toResult(window);
  }

  private async readAttemptWindow(
    database: DatabaseReader,
    originIpHash: string,
    referenceTime?: Date,
  ): Promise<AttemptWindow> {
    const [window] = referenceTime
      ? await this.readAttemptWindowAt(
          database,
          originIpHash,
          referenceTime.getTime(),
        )
      : await database.$queryRaw<AttemptWindow[]>`
          SELECT
            COUNT(*)::integer AS "current",
            GREATEST(
              1,
              CEIL(EXTRACT(EPOCH FROM (
                MIN("created_at") + make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
                - statement_timestamp()
              )))::integer
            ) AS "retryAfterSeconds"
          FROM "demo_generation_attempt"
          WHERE "origin_ip_hash" = ${originIpHash}
            AND "created_at" > statement_timestamp()
              - make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
        `;

    return window;
  }

  private readAttemptWindowAt(
    database: DatabaseReader,
    originIpHash: string,
    referenceTimeEpochMs: number,
  ): Promise<AttemptWindow[]> {
    return database.$queryRaw<AttemptWindow[]>`
      SELECT
        COUNT(*)::integer AS "current",
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (
            MIN("created_at") + make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
            - to_timestamp(${referenceTimeEpochMs} / 1000.0)
          )))::integer
        ) AS "retryAfterSeconds"
      FROM "demo_generation_attempt"
      WHERE "origin_ip_hash" = ${originIpHash}
        AND "created_at" > to_timestamp(${referenceTimeEpochMs} / 1000.0)
          - make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
    `;
  }

  private toResult(window: AttemptWindow): DemoGenerationRateLimitResult {
    const baseResult = {
      current: window.current,
      limit: DEMO_GENERATION_RATE_LIMIT,
      windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
    } as const;

    if (window.current < DEMO_GENERATION_RATE_LIMIT) {
      return { ...baseResult, allowed: true };
    }

    if (window.retryAfterSeconds === null) {
      throw new Error('Rate limit window is inconsistent.');
    }

    return {
      ...baseResult,
      allowed: false,
      retryAfterSeconds: window.retryAfterSeconds,
    };
  }
}
