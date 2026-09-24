import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export const DEMO_GENERATION_RATE_LIMIT = 3;
export const DEMO_GENERATION_WINDOW_SECONDS = 60;

const originIpHashPattern = /^[0-9a-f]{64}$/;
const advisoryLockDomain = 'demo-generation-rate-limit\0';

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
  referenceTime: Date;
  current: number;
  oldestCreatedAt: Date | null;
};

export class InvalidDemoOriginIpHashError extends Error {
  constructor() {
    super('Invalid DEMO origin hash.');
    this.name = 'InvalidDemoOriginIpHashError';
  }
}

export function demoOriginAdvisoryLockKey(originIpHash: string): bigint {
  if (originIpHash.length !== 64 || !originIpHashPattern.test(originIpHash)) {
    throw new InvalidDemoOriginIpHashError();
  }

  return createHash('sha256')
    .update(advisoryLockDomain, 'utf8')
    .update(originIpHash, 'ascii')
    .digest()
    .readBigInt64BE(0);
}

@Injectable()
export class DemoGenerationRateLimitService {
  constructor(private readonly database: DatabaseService) {}

  checkAndRegisterAttempt(
    originIpHash: string,
  ): Promise<DemoGenerationRateLimitResult> {
    const advisoryLockKey = demoOriginAdvisoryLockKey(originIpHash);

    return this.database.$transaction(async (transaction) => {
      await this.acquireOriginLock(transaction, advisoryLockKey);
      const window = await this.readAttemptWindow(transaction, originIpHash);
      const baseResult = {
        current: window.current,
        limit: DEMO_GENERATION_RATE_LIMIT,
        windowSeconds: DEMO_GENERATION_WINDOW_SECONDS,
      } as const;

      if (window.current >= DEMO_GENERATION_RATE_LIMIT) {
        return {
          ...baseResult,
          allowed: false,
          retryAfterSeconds: this.calculateRetryAfterSeconds(window),
        };
      }

      await transaction.demoGenerationAttempt.create({
        data: {
          originIpHash,
          createdAt: window.referenceTime,
        },
      });

      return {
        ...baseResult,
        allowed: true,
        current: window.current + 1,
      };
    });
  }

  private acquireOriginLock(
    transaction: Prisma.TransactionClient,
    advisoryLockKey: bigint,
  ): Promise<unknown> {
    return transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(${advisoryLockKey})::text
    `;
  }

  private async readAttemptWindow(
    transaction: Prisma.TransactionClient,
    originIpHash: string,
  ): Promise<AttemptWindow> {
    const [window] = await transaction.$queryRaw<AttemptWindow[]>`
      SELECT
        statement_timestamp() AS "referenceTime",
        COUNT(*)::integer AS "current",
        MIN("created_at") AS "oldestCreatedAt"
      FROM "demo_generation_attempt"
      WHERE "origin_ip_hash" = ${originIpHash}
        AND "created_at" > statement_timestamp()
          - make_interval(secs => ${DEMO_GENERATION_WINDOW_SECONDS})
    `;

    return window;
  }

  private calculateRetryAfterSeconds(window: AttemptWindow): number {
    if (window.oldestCreatedAt === null) {
      throw new Error('Rate limit window is inconsistent.');
    }

    const retryAt =
      window.oldestCreatedAt.getTime() + DEMO_GENERATION_WINDOW_SECONDS * 1_000;

    return Math.max(
      1,
      Math.ceil((retryAt - window.referenceTime.getTime()) / 1_000),
    );
  }
}
