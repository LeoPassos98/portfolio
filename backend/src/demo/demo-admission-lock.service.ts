import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

const originIpHashPattern = /^[0-9a-f]{64}$/;
const globalLockDomain = 'demo-global-admission\0';
const originLockDomain = 'demo-origin-admission\0';

export class InvalidDemoOriginIpHashError extends Error {
  constructor() {
    super('Invalid DEMO origin hash.');
    this.name = 'InvalidDemoOriginIpHashError';
  }
}

function advisoryLockKey(domain: string, value = ''): bigint {
  return createHash('sha256')
    .update(domain, 'utf8')
    .update(value, 'ascii')
    .digest()
    .readBigInt64BE(0);
}

export function demoGlobalAdvisoryLockKey(): bigint {
  return advisoryLockKey(globalLockDomain);
}

export function demoOriginAdvisoryLockKey(originIpHash: string): bigint {
  if (!originIpHashPattern.test(originIpHash)) {
    throw new InvalidDemoOriginIpHashError();
  }

  return advisoryLockKey(originLockDomain, originIpHash);
}

@Injectable()
export class DemoAdmissionLockService {
  acquireGlobalLock(transaction: Prisma.TransactionClient): Promise<unknown> {
    const lockKey = demoGlobalAdvisoryLockKey();

    return transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(${lockKey})::text
    `;
  }

  acquireOriginLock(
    transaction: Prisma.TransactionClient,
    originIpHash: string,
  ): Promise<unknown> {
    const lockKey = demoOriginAdvisoryLockKey(originIpHash);

    return transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(${lockKey})::text
    `;
  }
}
