import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DemoStatus, type Prisma } from '../generated/prisma/client.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';
import {
  DEMO_ACTIVATION_WINDOW_SECONDS,
  DemoCapacityService,
} from './demo-capacity.service.js';
import { DemoSeedService } from './demo-seed.service.js';
import { readDemoEnvironmentTime } from './demo-environment-time.js';

export const DEMO_EXPIRED_ERROR = {
  code: 'DEMO_EXPIRED',
  message: 'Demo access has expired',
} as const;
const PROVISIONING_FAILED_ERROR = {
  code: 'DEMO_PROVISIONING_FAILED',
  message: 'Demo provisioning failed; try logging in again',
} as const;

@Injectable()
export class DemoProvisioningService {
  private readonly logger = new Logger(DemoProvisioningService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly locks: DemoAdmissionLockService,
    private readonly capacity: DemoCapacityService,
    private readonly seed: DemoSeedService,
  ) {}

  async ensureReady(
    environmentId: string,
    originIpHash: string,
    usuarioId: string,
  ): Promise<boolean> {
    let seedStarted = false;
    let provisionedNow = false;
    let failure: HttpException | undefined;
    try {
      failure = await this.database.$transaction(
        async (transaction) => {
          await this.acquireLocks(transaction, originIpHash);
          const environment = await transaction.environment.findUniqueOrThrow({
            where: { id: environmentId },
          });
          Object.assign(
            environment,
            await readDemoEnvironmentTime(transaction, environmentId),
          );
          const now = await this.capacity.readReferenceTime(transaction);
          if (!environment.expiresAt || environment.expiresAt <= now)
            throw new UnauthorizedException(DEMO_EXPIRED_ERROR);
          if (environment.demoStatus === DemoStatus.PRONTA) return;
          if (environment.demoStatus === DemoStatus.PROVISIONANDO) {
            throw new ConflictException({
              code: 'DEMO_PROVISIONING_IN_PROGRESS',
              message: 'Demo provisioning is already in progress',
            });
          }
          if (environment.demoStatus === DemoStatus.PENDENTE) {
            if (
              now.getTime() - environment.criadoEm.getTime() >
              DEMO_ACTIVATION_WINDOW_SECONDS * 1_000
            ) {
              throw new UnauthorizedException({
                code: 'DEMO_ACTIVATION_EXPIRED',
                message: 'Demo activation window has expired',
              });
            }
            await this.requireActiveCapacity(transaction, originIpHash, now);
          } else if (environment.demoStatus !== DemoStatus.FALHA) {
            throw new ConflictException({
              code: 'DEMO_STATE_INVALID',
              message: 'Demo lifecycle state is invalid',
            });
          }

          await transaction.environment.update({
            where: { id: environmentId },
            data: { demoStatus: DemoStatus.PROVISIONANDO },
          });
          // Keep the transition and admission locks outside the seed savepoint.
          // A SQL error can then roll back every seed write without releasing capacity.
          await transaction.$executeRaw`SAVEPOINT demo_seed`;
          seedStarted = true;
          try {
            await this.seed.provision(transaction, environment, usuarioId);
            const provisionedAt =
              await this.capacity.readReferenceTime(transaction);
            if (environment.expiresAt <= provisionedAt)
              throw new UnauthorizedException(DEMO_EXPIRED_ERROR);
            await transaction.$executeRaw`
              UPDATE "environment"
              SET "demo_status" = 'PRONTA',
                  "provisioned_at" = to_timestamp(${provisionedAt.getTime()} / 1000.0)
              WHERE "id" = ${environmentId}::uuid
            `;
          } catch (error) {
            await transaction.$executeRaw`ROLLBACK TO SAVEPOINT demo_seed`;
            await transaction.$executeRaw`RELEASE SAVEPOINT demo_seed`;
            await transaction.environment.update({
              where: { id: environmentId },
              data: { demoStatus: DemoStatus.FALHA },
            });
            // Return the error: throwing here would roll back the FALHA transition.
            return error instanceof UnauthorizedException
              ? error
              : new ServiceUnavailableException(PROVISIONING_FAILED_ERROR);
          }
          await transaction.$executeRaw`RELEASE SAVEPOINT demo_seed`;
          provisionedNow = true;
        },
        { maxWait: 10_000, timeout: 30_000 },
      );
    } catch (error) {
      if (!seedStarted) throw error;
      // Never log seed errors or payloads: they may contain connection or credential data.
      this.logger.error('DEMO provisioning transaction could not commit.');
      throw new ServiceUnavailableException(PROVISIONING_FAILED_ERROR);
    }
    if (failure) {
      this.logger.error('DEMO seed rolled back; FALHA committed.');
      throw failure;
    }
    // Only report the transition after the transaction has committed.
    return provisionedNow;
  }

  private async acquireLocks(
    transaction: Prisma.TransactionClient,
    originIpHash: string,
  ): Promise<void> {
    await this.locks.acquireGlobalLock(transaction);
    await this.locks.acquireOriginLock(transaction, originIpHash);
  }

  private async requireActiveCapacity(
    transaction: Prisma.TransactionClient,
    originIpHash: string,
    now: Date,
  ): Promise<void> {
    const result = await this.capacity.inspectActiveInTransaction(
      transaction,
      originIpHash,
      now,
    );
    if (result.allowed) return;
    const global = result.reason === 'global-capacity';
    throw new HttpException(
      {
        code: global ? 'DEMO_CAPACITY_REACHED' : 'DEMO_ORIGIN_LIMIT_REACHED',
        message: global ? 'Demo capacity reached' : 'Demo origin limit reached',
        details: {
          current: result.current,
          limit: result.limit,
          retryAfterSeconds: result.retryAfterSeconds,
        },
      },
      global ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
