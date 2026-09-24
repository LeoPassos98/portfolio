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

async function createEnvironment(
  tipo: 'PRINCIPAL' | 'DEMO' = 'DEMO',
): Promise<string> {
  const id = crypto.randomUUID();

  await client.query(
    `INSERT INTO "environment" ("id", "tipo", "expires_at")
     VALUES ($1, $2, $3)`,
    [id, tipo, tipo === 'DEMO' ? new Date(Date.now() + 3_600_000) : null],
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
      ultimo_numero: number;
    }>(
      `SELECT e."id", e."tipo", e."expires_at", c."ultimo_numero"
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
      'environment_expiration_by_type_check',
      () =>
        client.query(
          `INSERT INTO "environment" ("id", "tipo", "expires_at")
           VALUES ($1, 'DEMO', NULL)`,
          [crypto.randomUUID()],
        ),
    );
    await expectConstraintViolation(
      'environment_principal_permanence_check',
      () =>
        client.query(
          `UPDATE "environment"
           SET "tipo" = 'DEMO', "expires_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1`,
          [PRINCIPAL_ENVIRONMENT_ID],
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
