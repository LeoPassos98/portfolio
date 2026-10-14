import type { Prisma } from '../generated/prisma/client.js';

/** Epoch avoids adapter timestamp decoding that depends on PostgreSQL's timezone. */
export async function readDemoEnvironmentTime(
  database: Pick<Prisma.TransactionClient, '$queryRaw'>,
  environmentId: string,
) {
  const [row] = await database.$queryRaw<
    Array<{ criadoEmEpochMs: bigint; expiresAtEpochMs: bigint | null }>
  >`
    SELECT FLOOR(EXTRACT(EPOCH FROM "criado_em") * 1000)::bigint AS "criadoEmEpochMs",
           FLOOR(EXTRACT(EPOCH FROM "expires_at") * 1000)::bigint AS "expiresAtEpochMs"
    FROM "environment" WHERE "id" = ${environmentId}::uuid
  `;
  return row
    ? {
        criadoEm: new Date(Number(row.criadoEmEpochMs)),
        expiresAt:
          row.expiresAtEpochMs === null
            ? null
            : new Date(Number(row.expiresAtEpochMs)),
      }
    : null;
}
