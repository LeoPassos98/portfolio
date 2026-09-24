import crypto from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PRINCIPAL_ENVIRONMENT_ID } from '../environments/principal-environment.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Environment tests.');
}

const pool = new Pool({ connectionString: databaseUrl });
let client: PoolClient;
const VALID_ORIGIN_IP_HASH = 'a'.repeat(64);

type DemoStatus = 'PENDENTE' | 'PROVISIONANDO' | 'PRONTA' | 'FALHA';
type DemoDataMode = 'EXEMPLO' | 'VAZIO';

type DemoEnvironmentOptions = {
  demoStatus?: DemoStatus;
  demoDataMode?: DemoDataMode;
  tutorialEnabled?: boolean;
  originIpHash?: string;
  criadoEm?: Date;
  expiresAt?: Date;
  provisionedAt?: Date | null;
};

async function expectConstraintViolation(
  constraint: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  await client.query('SAVEPOINT expected_constraint_violation');

  let failure: unknown;

  try {
    await operation();
  } catch (error: unknown) {
    failure = error;
  }

  await client.query('ROLLBACK TO SAVEPOINT expected_constraint_violation');
  await client.query('RELEASE SAVEPOINT expected_constraint_violation');
  expect(failure).toMatchObject({ constraint });
}

async function expectDatabaseRejection(
  operation: () => Promise<unknown>,
): Promise<void> {
  await client.query('SAVEPOINT expected_database_rejection');

  let failure: unknown;

  try {
    await operation();
  } catch (error: unknown) {
    failure = error;
  }

  await client.query('ROLLBACK TO SAVEPOINT expected_database_rejection');
  await client.query('RELEASE SAVEPOINT expected_database_rejection');
  expect(failure).toBeDefined();
}

async function createEnvironment(
  tipo: 'PRINCIPAL' | 'DEMO' = 'DEMO',
  options: DemoEnvironmentOptions = {},
): Promise<string> {
  const id = crypto.randomUUID();

  if (tipo === 'PRINCIPAL') {
    await client.query(
      `INSERT INTO "environment" ("id", "tipo")
       VALUES ($1, 'PRINCIPAL')`,
      [id],
    );

    return id;
  }

  const criadoEm = options.criadoEm ?? new Date();
  const demoStatus = options.demoStatus ?? 'PENDENTE';
  const provisionedAt =
    options.provisionedAt === undefined
      ? demoStatus === 'PRONTA'
        ? criadoEm
        : null
      : options.provisionedAt;

  await client.query(
    `INSERT INTO "environment"
       ("id", "tipo", "criado_em", "expires_at", "demo_status", "demo_data_mode", "tutorial_enabled", "origin_ip_hash", "provisioned_at")
     VALUES ($1, 'DEMO', $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      criadoEm,
      options.expiresAt ?? new Date(criadoEm.getTime() + 86_400_000),
      demoStatus,
      options.demoDataMode ?? 'EXEMPLO',
      options.tutorialEnabled ?? true,
      options.originIpHash ?? VALID_ORIGIN_IP_HASH,
      provisionedAt,
    ],
  );

  return id;
}

async function createEmployee(environmentId: string): Promise<string> {
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "funcionario"
       ("id", "environment_id", "nome", "telefone", "email")
     VALUES ($1, $2, $3, '11999999999', $4)`,
    [id, environmentId, `Funcionário ${id}`, `${id}@example.test`],
  );

  return id;
}

async function createUser(
  environmentId: string,
  funcionarioId: string,
  emailLogin = `${crypto.randomUUID()}@example.test`,
): Promise<string> {
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "usuario"
       ("id", "environment_id", "email_login", "senha_hash", "perfil", "funcionario_id")
     VALUES ($1, $2, $3, 'test-only-hash', 'FUNCIONARIO', $4)`,
    [id, environmentId, emailLogin, funcionarioId],
  );

  return id;
}

async function createClient(
  environmentId: string,
  documento: string | null = null,
): Promise<string> {
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "cliente"
       ("id", "environment_id", "nome", "telefone", "documento", "cep", "logradouro", "numero", "bairro", "cidade", "uf")
     VALUES ($1, $2, $3, '11988887777', $4, '01001000', 'Praça da Sé', '1', 'Sé', 'São Paulo', 'SP')`,
    [id, environmentId, `Cliente ${id}`, documento],
  );

  return id;
}

async function createOrder(
  environmentId: string,
  clienteId: string,
  responsavelId: string,
  numero = `OS-${crypto.randomUUID()}`,
): Promise<string> {
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "ordem_servico"
       ("id", "environment_id", "numero", "descricao", "valor", "cliente_id", "responsavel_id")
     VALUES ($1, $2, $3, 'Ordem de teste', 10.00, $4, $5)`,
    [id, environmentId, numero, clienteId, responsavelId],
  );

  return id;
}

async function createHistory(
  environmentId: string,
  ordemServicoId: string,
  responsavelId: string,
  alteradoPorUsuarioId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO "historico_ordem_servico"
       ("id", "environment_id", "versao", "descricao", "valor", "status", "visibilidade", "ordem_servico_id", "responsavel_id", "alterado_por_usuario_id")
     VALUES ($1, $2, 1, 'Snapshot de teste', 10.00, 'AGUARDANDO', 'PRIVADA', $3, $4, $5)`,
    [
      crypto.randomUUID(),
      environmentId,
      ordemServicoId,
      responsavelId,
      alteradoPorUsuarioId,
    ],
  );
}

describe('Environment database integrity', () => {
  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('keeps exactly one permanent PRINCIPAL and its preserved per-Environment counter', async () => {
    const principal = await client.query<{
      id: string;
      tipo: string;
      expires_at: Date | null;
      demo_status: string | null;
      demo_data_mode: string | null;
      tutorial_enabled: boolean | null;
      origin_ip_hash: string | null;
      provisioned_at: Date | null;
      ultimo_numero: number;
    }>(
      `SELECT
         e."id",
         e."tipo",
         e."expires_at",
         e."demo_status",
         e."demo_data_mode",
         e."tutorial_enabled",
         e."origin_ip_hash",
         e."provisioned_at",
         c."ultimo_numero"
       FROM "environment" AS e
       JOIN "contador_ordem_servico" AS c
         ON c."environment_id" = e."id"
       WHERE e."tipo" = 'PRINCIPAL'`,
    );

    expect(principal.rows).toEqual([
      {
        id: PRINCIPAL_ENVIRONMENT_ID,
        tipo: 'PRINCIPAL',
        expires_at: null,
        demo_status: null,
        demo_data_mode: null,
        tutorial_enabled: null,
        origin_ip_hash: null,
        provisioned_at: null,
        ultimo_numero: expect.any(Number),
      },
    ]);

    const ownershipColumns = await client.query<{
      table_name: string;
      is_nullable: 'YES' | 'NO';
    }>(
      `SELECT table_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'environment_id'
       ORDER BY table_name`,
    );
    expect(ownershipColumns.rows).toEqual([
      { table_name: 'cliente', is_nullable: 'NO' },
      { table_name: 'contador_ordem_servico', is_nullable: 'NO' },
      { table_name: 'funcionario', is_nullable: 'NO' },
      { table_name: 'historico_ordem_servico', is_nullable: 'NO' },
      { table_name: 'ordem_servico', is_nullable: 'NO' },
      { table_name: 'usuario', is_nullable: 'NO' },
    ]);

    const legacyCounterId = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'contador_ordem_servico'
         AND column_name = 'id'`,
    );
    expect(legacyCounterId.rowCount).toBe(0);

    await expectConstraintViolation(
      'environment_single_principal_key',
      async () => {
        await createEnvironment('PRINCIPAL');
      },
    );
    await expectConstraintViolation(
      'environment_expiration_by_type_check',
      () =>
        client.query(
          `UPDATE "environment"
           SET "expires_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          [PRINCIPAL_ENVIRONMENT_ID],
        ),
    );
    await expectConstraintViolation(
      'environment_principal_permanence_check',
      () =>
        client.query(
          `UPDATE "environment"
           SET
             "tipo" = 'DEMO',
             "expires_at" = "criado_em" + INTERVAL '24 hours',
             "demo_status" = 'PENDENTE',
             "demo_data_mode" = 'EXEMPLO',
             "tutorial_enabled" = TRUE,
             "origin_ip_hash" = $2
           WHERE "id" = $1`,
          [PRINCIPAL_ENVIRONMENT_ID, VALID_ORIGIN_IP_HASH],
        ),
    );
    await expectConstraintViolation(
      'environment_principal_permanence_check',
      () =>
        client.query(`DELETE FROM "environment" WHERE "id" = $1`, [
          PRINCIPAL_ENVIRONMENT_ID,
        ]),
    );

    const removableDemoEnvironmentId = await createEnvironment();
    const deletedDemo = await client.query(
      `DELETE FROM "environment" WHERE "id" = $1`,
      [removableDemoEnvironmentId],
    );
    expect(deletedDemo.rowCount).toBe(1);
  });

  it('rejects DEMO-only values on PRINCIPAL', async () => {
    const updates = [
      `"demo_status" = 'PENDENTE'`,
      `"demo_data_mode" = 'EXEMPLO'`,
      `"tutorial_enabled" = TRUE`,
      `"origin_ip_hash" = '${VALID_ORIGIN_IP_HASH}'`,
      `"provisioned_at" = CURRENT_TIMESTAMP`,
    ];

    for (const assignment of updates) {
      await expectConstraintViolation(
        'environment_principal_demo_fields_check',
        () =>
          client.query(
            `UPDATE "environment"
             SET ${assignment}
             WHERE "id" = $1`,
            [PRINCIPAL_ENVIRONMENT_ID],
          ),
      );
    }
  });

  it.each([
    { demoDataMode: 'EXEMPLO' as const, tutorialEnabled: true },
    { demoDataMode: 'VAZIO' as const, tutorialEnabled: false },
  ])(
    'creates a valid pending DEMO with $demoDataMode data and tutorial=$tutorialEnabled',
    async ({ demoDataMode, tutorialEnabled }) => {
      const criadoEm = new Date('2026-09-24T12:00:00.123Z');
      const id = await createEnvironment('DEMO', {
        demoDataMode,
        tutorialEnabled,
        criadoEm,
      });
      const result = await client.query(
        `SELECT
           "demo_status",
           "demo_data_mode",
           "tutorial_enabled",
           "origin_ip_hash",
           "criado_em",
           "expires_at",
           "provisioned_at"
         FROM "environment"
         WHERE "id" = $1`,
        [id],
      );

      expect(result.rows).toEqual([
        {
          demo_status: 'PENDENTE',
          demo_data_mode: demoDataMode,
          tutorial_enabled: tutorialEnabled,
          origin_ip_hash: VALID_ORIGIN_IP_HASH,
          criado_em: criadoEm,
          expires_at: new Date(criadoEm.getTime() + 86_400_000),
          provisioned_at: null,
        },
      ]);
    },
  );

  it('rejects a DEMO without each mandatory field', async () => {
    const criadoEm = new Date('2026-09-24T12:00:00.000Z');
    const requiredColumns = [
      {
        column: 'expires_at',
        constraint: 'environment_expiration_by_type_check',
      },
      {
        column: 'demo_status',
        constraint: 'environment_demo_required_fields_check',
      },
      {
        column: 'demo_data_mode',
        constraint: 'environment_demo_required_fields_check',
      },
      {
        column: 'tutorial_enabled',
        constraint: 'environment_demo_required_fields_check',
      },
      {
        column: 'origin_ip_hash',
        constraint: 'environment_demo_required_fields_check',
      },
    ];

    for (const { column, constraint } of requiredColumns) {
      const values = {
        expires_at: new Date(criadoEm.getTime() + 86_400_000),
        demo_status: 'PENDENTE',
        demo_data_mode: 'EXEMPLO',
        tutorial_enabled: true,
        origin_ip_hash: VALID_ORIGIN_IP_HASH,
      } as const;

      await expectConstraintViolation(constraint, () => {
        const candidate = { ...values, [column]: null };

        return client.query(
          `INSERT INTO "environment"
             ("id", "tipo", "criado_em", "expires_at", "demo_status", "demo_data_mode", "tutorial_enabled", "origin_ip_hash")
           VALUES ($1, 'DEMO', $2, $3, $4, $5, $6, $7)`,
          [
            crypto.randomUUID(),
            criadoEm,
            candidate.expires_at,
            candidate.demo_status,
            candidate.demo_data_mode,
            candidate.tutorial_enabled,
            candidate.origin_ip_hash,
          ],
        );
      });
    }
  });

  it('enforces the lowercase SHA-256 hexadecimal format for originIpHash', async () => {
    for (const invalidHash of [
      'a'.repeat(63),
      `${'a'.repeat(63)}g`,
      'A'.repeat(64),
    ]) {
      await expectConstraintViolation(
        'environment_demo_origin_ip_hash_check',
        () => createEnvironment('DEMO', { originIpHash: invalidHash }),
      );
    }

    await expectDatabaseRejection(() =>
      createEnvironment('DEMO', { originIpHash: 'a'.repeat(65) }),
    );

    await expect(
      createEnvironment('DEMO', { originIpHash: '0'.repeat(64) }),
    ).resolves.toEqual(expect.any(String));
  });

  it('requires DEMO expiration to be exactly 24 hours after creation', async () => {
    const criadoEm = new Date('2026-09-24T12:00:00.000Z');

    await expectConstraintViolation(
      'environment_demo_fixed_expiration_check',
      () =>
        createEnvironment('DEMO', {
          criadoEm,
          expiresAt: new Date(criadoEm.getTime() + 86_400_001),
        }),
    );
  });

  it('ties provisionedAt presence to the durable DEMO status', async () => {
    const provisionedAt = new Date('2026-09-24T13:00:00.000Z');

    for (const demoStatus of ['PENDENTE', 'PROVISIONANDO', 'FALHA'] as const) {
      await expectConstraintViolation(
        'environment_demo_provisioned_at_check',
        () => createEnvironment('DEMO', { demoStatus, provisionedAt }),
      );
    }

    await expectConstraintViolation(
      'environment_demo_provisioned_at_check',
      () =>
        createEnvironment('DEMO', {
          demoStatus: 'PRONTA',
          provisionedAt: null,
        }),
    );

    const readyId = await createEnvironment('DEMO', {
      demoStatus: 'PRONTA',
      provisionedAt,
    });
    const ready = await client.query(
      `SELECT "demo_status", "provisioned_at"
       FROM "environment"
       WHERE "id" = $1`,
      [readyId],
    );
    expect(ready.rows).toEqual([
      { demo_status: 'PRONTA', provisioned_at: provisionedAt },
    ]);
  });

  it('allows every approved DEMO status transition', async () => {
    const pendingId = await createEnvironment();
    await client.query(
      `UPDATE "environment"
       SET "demo_status" = 'PROVISIONANDO'
       WHERE "id" = $1`,
      [pendingId],
    );

    const provisionedAt = new Date();
    await client.query(
      `UPDATE "environment"
       SET "demo_status" = 'PRONTA', "provisioned_at" = $2
       WHERE "id" = $1`,
      [pendingId, provisionedAt],
    );

    const retryId = await createEnvironment('DEMO', {
      demoStatus: 'PROVISIONANDO',
    });
    await client.query(
      `UPDATE "environment"
       SET "demo_status" = 'FALHA'
       WHERE "id" = $1`,
      [retryId],
    );
    await client.query(
      `UPDATE "environment"
       SET "demo_status" = 'PROVISIONANDO'
       WHERE "id" = $1`,
      [retryId],
    );

    const statuses = await client.query(
      `SELECT "id", "demo_status", "provisioned_at"
       FROM "environment"
       WHERE "id" IN ($1, $2)
       ORDER BY "id"`,
      [pendingId, retryId],
    );
    expect(statuses.rows).toEqual(
      [
        {
          id: pendingId,
          demo_status: 'PRONTA',
          provisioned_at: provisionedAt,
        },
        {
          id: retryId,
          demo_status: 'PROVISIONANDO',
          provisioned_at: null,
        },
      ].sort((left, right) => left.id.localeCompare(right.id)),
    );
  });

  it('rejects unapproved DEMO status transitions and keeps PRONTA terminal', async () => {
    const pendingId = await createEnvironment();

    for (const target of ['PRONTA', 'FALHA'] as const) {
      await expectConstraintViolation(
        'environment_demo_status_transition_check',
        () =>
          client.query(
            `UPDATE "environment"
             SET "demo_status" = $2::"demo_status",
                 "provisioned_at" = CASE
                   WHEN $2::"demo_status" = 'PRONTA' THEN CURRENT_TIMESTAMP
                   ELSE NULL
                 END
             WHERE "id" = $1`,
            [pendingId, target],
          ),
      );
    }

    const failedId = await createEnvironment('DEMO', { demoStatus: 'FALHA' });
    await expectConstraintViolation(
      'environment_demo_status_transition_check',
      () =>
        client.query(
          `UPDATE "environment"
           SET "demo_status" = 'PRONTA', "provisioned_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          [failedId],
        ),
    );

    const readyId = await createEnvironment('DEMO', { demoStatus: 'PRONTA' });
    for (const target of ['PENDENTE', 'PROVISIONANDO', 'FALHA'] as const) {
      await expectConstraintViolation(
        'environment_demo_status_transition_check',
        () =>
          client.query(
            `UPDATE "environment"
             SET "demo_status" = $2, "provisioned_at" = NULL
             WHERE "id" = $1`,
            [readyId, target],
          ),
      );
    }
  });

  it('keeps the DEMO configuration and expiration immutable', async () => {
    const demoId = await createEnvironment();
    const assignments = [
      `"demo_data_mode" = 'VAZIO'`,
      `"tutorial_enabled" = FALSE`,
      `"origin_ip_hash" = '${'b'.repeat(64)}'`,
      `"expires_at" = "expires_at" + INTERVAL '1 second'`,
    ];

    for (const assignment of assignments) {
      await expectConstraintViolation(
        'environment_demo_immutable_fields_check',
        () =>
          client.query(
            `UPDATE "environment"
             SET ${assignment}
             WHERE "id" = $1`,
            [demoId],
          ),
      );
    }
  });

  it('creates the lifecycle lookup indexes with the approved column order', async () => {
    const indexes = await client.query<{
      index_name: string;
      columns: string[];
    }>(
      `SELECT
         index_class.relname AS index_name,
         array_agg(attribute.attname::TEXT ORDER BY key.ordinality) AS columns
       FROM pg_class AS table_class
       JOIN pg_index AS index_metadata
         ON index_metadata.indrelid = table_class.oid
       JOIN pg_class AS index_class
         ON index_class.oid = index_metadata.indexrelid
       CROSS JOIN LATERAL unnest(index_metadata.indkey)
         WITH ORDINALITY AS key(attribute_number, ordinality)
       JOIN pg_attribute AS attribute
         ON attribute.attrelid = table_class.oid
        AND attribute.attnum = key.attribute_number
       WHERE table_class.relname = 'environment'
         AND index_class.relname IN (
           'environment_tipo_expires_at_idx',
           'environment_origin_ip_hash_expires_at_idx'
         )
       GROUP BY index_class.relname
       ORDER BY index_class.relname`,
    );

    expect(indexes.rows).toEqual([
      {
        index_name: 'environment_origin_ip_hash_expires_at_idx',
        columns: ['origin_ip_hash', 'expires_at'],
      },
      {
        index_name: 'environment_tipo_expires_at_idx',
        columns: ['tipo', 'expires_at'],
      },
    ]);
  });

  it('scopes business uniques while keeping login email global', async () => {
    const demoEnvironmentId = await createEnvironment();
    const documento = crypto.randomUUID();
    await createClient(PRINCIPAL_ENVIRONMENT_ID, documento);
    await createClient(demoEnvironmentId, documento);
    await createClient(PRINCIPAL_ENVIRONMENT_ID);
    await createClient(PRINCIPAL_ENVIRONMENT_ID);

    await expectConstraintViolation(
      'cliente_environment_id_documento_key',
      () => createClient(PRINCIPAL_ENVIRONMENT_ID, documento),
    );

    const principalEmployeeId = await createEmployee(PRINCIPAL_ENVIRONMENT_ID);
    const demoEmployeeId = await createEmployee(demoEnvironmentId);
    const loginEmail = `${crypto.randomUUID()}@example.test`;
    await createUser(PRINCIPAL_ENVIRONMENT_ID, principalEmployeeId, loginEmail);
    await expectConstraintViolation('usuario_email_login_key', () =>
      createUser(demoEnvironmentId, demoEmployeeId, loginEmail),
    );

    const principalClientId = await createClient(PRINCIPAL_ENVIRONMENT_ID);
    const demoClientId = await createClient(demoEnvironmentId);
    const numero = `OS-${crypto.randomUUID()}`;
    await createOrder(
      PRINCIPAL_ENVIRONMENT_ID,
      principalClientId,
      principalEmployeeId,
      numero,
    );
    await createOrder(demoEnvironmentId, demoClientId, demoEmployeeId, numero);
    await expectConstraintViolation(
      'ordem_servico_environment_id_numero_key',
      () =>
        createOrder(
          PRINCIPAL_ENVIRONMENT_ID,
          principalClientId,
          principalEmployeeId,
          numero,
        ),
    );
  });

  it('rejects every cross-Environment domain relationship', async () => {
    const demoEnvironmentId = await createEnvironment();
    const principalEmployeeId = await createEmployee(PRINCIPAL_ENVIRONMENT_ID);
    const demoEmployeeId = await createEmployee(demoEnvironmentId);
    const principalUserId = await createUser(
      PRINCIPAL_ENVIRONMENT_ID,
      principalEmployeeId,
    );
    const demoUserId = await createUser(demoEnvironmentId, demoEmployeeId);
    const principalClientId = await createClient(PRINCIPAL_ENVIRONMENT_ID);
    const demoClientId = await createClient(demoEnvironmentId);
    const principalOrderId = await createOrder(
      PRINCIPAL_ENVIRONMENT_ID,
      principalClientId,
      principalEmployeeId,
    );
    const demoOrderId = await createOrder(
      demoEnvironmentId,
      demoClientId,
      demoEmployeeId,
    );

    await expectConstraintViolation(
      'usuario_environment_funcionario_fkey',
      () => createUser(demoEnvironmentId, principalEmployeeId),
    );
    await expectConstraintViolation(
      'ordem_servico_environment_cliente_fkey',
      () => createOrder(demoEnvironmentId, principalClientId, demoEmployeeId),
    );
    await expectConstraintViolation(
      'ordem_servico_environment_responsavel_fkey',
      () => createOrder(demoEnvironmentId, demoClientId, principalEmployeeId),
    );
    await expectConstraintViolation('historico_environment_ordem_fkey', () =>
      createHistory(
        demoEnvironmentId,
        principalOrderId,
        demoEmployeeId,
        demoUserId,
      ),
    );
    await expectConstraintViolation(
      'historico_environment_responsavel_fkey',
      () =>
        createHistory(
          demoEnvironmentId,
          demoOrderId,
          principalEmployeeId,
          demoUserId,
        ),
    );
    await expectConstraintViolation('historico_environment_autor_fkey', () =>
      createHistory(
        demoEnvironmentId,
        demoOrderId,
        demoEmployeeId,
        principalUserId,
      ),
    );
  });
});
