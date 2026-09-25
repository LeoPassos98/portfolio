import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export const DEMO_PENDING_LIMIT = 3;
export const DEMO_ORIGIN_ACTIVE_LIMIT = 3;
export const DEMO_GLOBAL_ACTIVE_LIMIT = 50;
export const DEMO_ACTIVATION_WINDOW_SECONDS = 60 * 60;

type DemoCapacityFailureReason =
  'pending-limit' | 'origin-limit' | 'global-capacity';

export type DemoCapacityResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: DemoCapacityFailureReason;
      current: number;
      limit: number;
      retryAfterSeconds: number;
    };

type CapacityWindow = {
  current: number;
  retryAfterSeconds: number | null;
};

type DatabaseReader = DatabaseService | Prisma.TransactionClient;

@Injectable()
export class DemoCapacityService {
  constructor(private readonly database: DatabaseService) {}

  async inspect(originIpHash: string): Promise<DemoCapacityResult> {
    const referenceTime = await this.readReferenceTime(this.database);

    return this.inspectInTransaction(
      this.database,
      originIpHash,
      referenceTime,
    );
  }

  async inspectInTransaction(
    transaction: DatabaseReader,
    originIpHash: string,
    referenceTime: Date,
  ): Promise<DemoCapacityResult> {
    const referenceTimeEpochMs = referenceTime.getTime();
    const [pending] = await transaction.$queryRaw<CapacityWindow[]>`
      SELECT
        COUNT(*)::integer AS "current",
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (
            MIN("criado_em") + make_interval(secs => ${DEMO_ACTIVATION_WINDOW_SECONDS})
            - to_timestamp(${referenceTimeEpochMs} / 1000.0)
          )))::integer
        ) AS "retryAfterSeconds"
      FROM "environment"
      WHERE "tipo" = 'DEMO'
        AND "demo_status" = 'PENDENTE'
        AND "origin_ip_hash" = ${originIpHash}
        AND "criado_em" > to_timestamp(${referenceTimeEpochMs} / 1000.0)
          - make_interval(secs => ${DEMO_ACTIVATION_WINDOW_SECONDS})
    `;
    const pendingFailure = this.blockedResult(
      pending,
      'pending-limit',
      DEMO_PENDING_LIMIT,
    );

    if (pendingFailure) return pendingFailure;

    const [activeOrigin] = await transaction.$queryRaw<CapacityWindow[]>`
      SELECT
        COUNT(*)::integer AS "current",
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (
            MIN("expires_at") - to_timestamp(${referenceTimeEpochMs} / 1000.0)
          )))::integer
        ) AS "retryAfterSeconds"
      FROM "environment"
      WHERE "tipo" = 'DEMO'
        AND "demo_status" IN ('PROVISIONANDO', 'FALHA', 'PRONTA')
        AND "origin_ip_hash" = ${originIpHash}
        AND "expires_at" > to_timestamp(${referenceTimeEpochMs} / 1000.0)
    `;
    const originFailure = this.blockedResult(
      activeOrigin,
      'origin-limit',
      DEMO_ORIGIN_ACTIVE_LIMIT,
    );

    if (originFailure) return originFailure;

    const [activeGlobal] = await transaction.$queryRaw<CapacityWindow[]>`
      SELECT
        COUNT(*)::integer AS "current",
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (
            MIN("expires_at") - to_timestamp(${referenceTimeEpochMs} / 1000.0)
          )))::integer
        ) AS "retryAfterSeconds"
      FROM "environment"
      WHERE "tipo" = 'DEMO'
        AND "demo_status" IN ('PROVISIONANDO', 'FALHA', 'PRONTA')
        AND "expires_at" > to_timestamp(${referenceTimeEpochMs} / 1000.0)
    `;
    const globalFailure = this.blockedResult(
      activeGlobal,
      'global-capacity',
      DEMO_GLOBAL_ACTIVE_LIMIT,
    );

    return globalFailure ?? { allowed: true };
  }

  async readReferenceTime(transaction: DatabaseReader): Promise<Date> {
    const [result] = await transaction.$queryRaw<
      Array<{ referenceTimeEpochMs: bigint }>
    >`
      SELECT FLOOR(
        EXTRACT(EPOCH FROM statement_timestamp()) * 1000
      )::bigint AS "referenceTimeEpochMs"
    `;

    return new Date(Number(result.referenceTimeEpochMs));
  }

  private blockedResult(
    window: CapacityWindow,
    reason: DemoCapacityFailureReason,
    limit: number,
  ): Exclude<DemoCapacityResult, { allowed: true }> | null {
    if (window.current < limit) return null;

    if (window.retryAfterSeconds === null) {
      throw new Error('DEMO capacity window is inconsistent.');
    }

    return {
      allowed: false,
      reason,
      current: window.current,
      limit,
      retryAfterSeconds: window.retryAfterSeconds,
    };
  }
}
