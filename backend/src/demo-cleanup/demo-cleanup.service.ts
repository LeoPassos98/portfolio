import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DemoAdmissionLockService } from '../demo/demo-admission-lock.service.js';
import { Prisma, TipoEnvironment } from '../generated/prisma/client.js';

export const DEMO_CLEANUP_GRACE_SECONDS = 60 * 60;
export const DEMO_CLEANUP_BATCH_SIZE = 100;
export const DEMO_GENERATION_ATTEMPT_RETENTION_SECONDS = 24 * 60 * 60;

export type DemoCleanupResult = {
  environmentsDeleted: number;
  sessionsDeleted: number;
  generationAttemptsDeleted: number;
};

@Injectable()
export class DemoCleanupService {
  constructor(
    private readonly database: DatabaseService,
    private readonly admissionLocks: DemoAdmissionLockService,
  ) {}

  async cleanup(): Promise<DemoCleanupResult> {
    const result: DemoCleanupResult = {
      environmentsDeleted: 0,
      sessionsDeleted: 0,
      generationAttemptsDeleted: 0,
    };

    while (true) {
      const batch = await this.deleteBatch();
      result.environmentsDeleted += batch.environmentsDeleted;
      result.sessionsDeleted += batch.sessionsDeleted;
      if (batch.environmentsDeleted === 0) break;
    }

    // Independent rate-limit records do not need to hold the admission lock.
    result.generationAttemptsDeleted = await this.database.$transaction(
      (transaction) => transaction.$executeRaw`
        DELETE FROM "demo_generation_attempt"
        WHERE "created_at" < statement_timestamp()
          - make_interval(secs => ${DEMO_GENERATION_ATTEMPT_RETENTION_SECONDS})
      `,
    );
    return result;
  }

  private deleteBatch(): Promise<
    Pick<DemoCleanupResult, 'environmentsDeleted' | 'sessionsDeleted'>
  > {
    return this.database.$transaction(
      async (transaction) => {
        await this.admissionLocks.acquireGlobalLock(transaction);
        // statement_timestamp() is evaluated after waiting for the global lock.
        const environments = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "environment"
          WHERE "tipo" = 'DEMO'
            AND "expires_at" <= statement_timestamp()
              - make_interval(secs => ${DEMO_CLEANUP_GRACE_SECONDS})
          ORDER BY "expires_at" ASC, "id" ASC
          LIMIT ${DEMO_CLEANUP_BATCH_SIZE}
          FOR UPDATE
        `;
        if (environments.length === 0) {
          return { environmentsDeleted: 0, sessionsDeleted: 0 };
        }

        const environmentIds = environments.map(({ id }) => id);
        const where = { environmentId: { in: environmentIds } };
        // session has no user FK; compare JSON text without casting its contents.
        const sessionsDeleted = await transaction.$executeRaw`
          DELETE FROM "session" AS session
          USING "usuario" AS usuario
          WHERE session."sess" ->> 'usuarioId' = usuario."id"::text
            AND usuario."environment_id" IN (
              ${Prisma.join(environmentIds.map((id) => Prisma.sql`${id}::uuid`))}
            )
        `;
        await transaction.historicoOrdemServico.deleteMany({ where });
        await transaction.ordemServico.deleteMany({ where });
        await transaction.usuario.deleteMany({ where });
        await transaction.cliente.deleteMany({ where });
        await transaction.funcionario.deleteMany({ where });
        await transaction.contadorOrdemServico.deleteMany({ where });
        const deleted = await transaction.environment.deleteMany({
          where: { id: { in: environmentIds }, tipo: TipoEnvironment.DEMO },
        });
        return { environmentsDeleted: deleted.count, sessionsDeleted };
      },
      // Allow a running provisioning transaction to release its shared lock.
      { maxWait: 10_000, timeout: 60_000 },
    );
  }
}
