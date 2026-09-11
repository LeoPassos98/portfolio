import crypto from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { PasswordService } from '../auth/password/password.service.js';
import { DatabaseService } from '../database/database.service.js';
import { Perfil } from '../generated/prisma/client.js';
import { AdminBootstrapModule } from './admin-bootstrap.module.js';
import {
  ADMIN_BOOTSTRAP_LOCK,
  AdminBootstrapAlreadyInitializedError,
  AdminBootstrapService,
} from './admin-bootstrap.service.js';
import {
  AdminBootstrapConfigurationError,
  parseAdminBootstrapEnvironment,
  type AdminBootstrapInput,
} from './admin-bootstrap.schema.js';

const testEmailDomain = 'bootstrap.example.test';
const failureTriggerName = 'bootstrap_admin_test_reject_usuario';
const failureFunctionName = 'bootstrap_admin_test_reject_usuario';

function createInput(
  overrides: Partial<AdminBootstrapInput> = {},
): AdminBootstrapInput {
  const suffix = crypto.randomUUID();

  return {
    nome: `Administrador Bootstrap ${suffix}`,
    telefone: '11987654321',
    email: `contato-${suffix}@${testEmailDomain}`,
    loginEmail: `login-${suffix}@${testEmailDomain}`,
    password: 'senha temporaria artificial',
    ...overrides,
  };
}

describe('AdminBootstrapService', () => {
  let module: TestingModule;
  let database: DatabaseService;
  let passwordService: PasswordService;
  let service: AdminBootstrapService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AdminBootstrapModule],
    }).compile();
    await module.init();

    database = module.get(DatabaseService);
    passwordService = module.get(PasswordService);
    service = module.get(AdminBootstrapService);
  });

  beforeEach(async () => {
    expect(await database.usuario.count()).toBe(0);
  });

  afterEach(async () => {
    await dropFailureTrigger();
    await database.usuario.deleteMany({
      where: { emailLogin: { endsWith: `@${testEmailDomain}` } },
    });
    await database.funcionario.deleteMany({
      where: { email: { endsWith: `@${testEmailDomain}` } },
    });
  });

  afterAll(async () => {
    await module.close();
  });

  async function dropFailureTrigger(): Promise<void> {
    await database.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS ${failureTriggerName} ON usuario`,
    );
    await database.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS ${failureFunctionName}()`,
    );
  }

  async function waitForBootstrapLockWaiters(expected: number): Promise<void> {
    const timeoutAt = Date.now() + 2_000;

    while (Date.now() < timeoutAt) {
      const [lock] = await database.$queryRaw<Array<{ waiters: bigint }>>`
        SELECT count(*) AS waiters
        FROM pg_locks
        WHERE locktype = 'advisory'
          AND classid = ${ADMIN_BOOTSTRAP_LOCK.namespace}::oid
          AND objid = ${ADMIN_BOOTSTRAP_LOCK.operation}::oid
          AND NOT granted
      `;

      if (Number(lock.waiters) === expected) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for concurrent bootstrap lock waiters');
  }

  it('creates the first active administrator with a normalized login and verifiable temporary password', async () => {
    const input = parseAdminBootstrapEnvironment({
      BOOTSTRAP_ADMIN_NAME: '  Administradora Inicial  ',
      BOOTSTRAP_ADMIN_PHONE: '+55 (11) 98765-4321',
      BOOTSTRAP_ADMIN_CONTACT_EMAIL: `contact@${testEmailDomain}`,
      BOOTSTRAP_ADMIN_LOGIN_EMAIL: `  FIRST.ADMIN@${testEmailDomain}  `,
      BOOTSTRAP_ADMIN_PASSWORD: '  senha temporaria  ',
    });

    const result = await service.createFirstAdministrator(input);
    const [funcionario, usuario] = await Promise.all([
      database.funcionario.findUniqueOrThrow({
        where: { id: result.funcionarioId },
      }),
      database.usuario.findUniqueOrThrow({
        where: { id: result.usuarioId },
      }),
    ]);

    expect(funcionario).toMatchObject({
      nome: 'Administradora Inicial',
      telefone: '11987654321',
      email: `contact@${testEmailDomain}`,
      ativo: true,
    });
    expect(usuario).toMatchObject({
      emailLogin: `first.admin@${testEmailDomain}`,
      perfil: Perfil.ADMINISTRADOR,
      ativo: true,
      deveAlterarSenha: true,
      funcionarioId: funcionario.id,
    });
    expect(usuario.senhaHash).not.toBe(input.password);
    await expect(
      passwordService.verify(usuario.senhaHash, input.password),
    ).resolves.toBe(true);
  });

  it('refuses a second bootstrap without changing existing records', async () => {
    const existingInput = createInput();
    const existingFuncionario = await database.funcionario.create({
      data: {
        nome: existingInput.nome,
        telefone: existingInput.telefone,
        email: existingInput.email,
        ativo: false,
        usuario: {
          create: {
            emailLogin: existingInput.loginEmail,
            senhaHash: 'hash existente artificial',
            perfil: Perfil.FUNCIONARIO,
            ativo: false,
            deveAlterarSenha: false,
          },
        },
      },
      include: { usuario: true },
    });

    await expect(
      service.createFirstAdministrator(createInput()),
    ).rejects.toBeInstanceOf(AdminBootstrapAlreadyInitializedError);

    await expect(
      database.funcionario.findUniqueOrThrow({
        where: { id: existingFuncionario.id },
        include: { usuario: true },
      }),
    ).resolves.toEqual(existingFuncionario);
    await expect(database.funcionario.count()).resolves.toBe(1);
    await expect(database.usuario.count()).resolves.toBe(1);
  });

  it.each([
    ['invalid login email', 'invalid-email', 'valid artificial password'],
    [
      'password shorter than 8 characters',
      `admin@${testEmailDomain}`,
      '1234567',
    ],
    [
      'password longer than 128 characters',
      `admin@${testEmailDomain}`,
      'a'.repeat(129),
    ],
  ])(
    'rejects %s before any database write',
    async (_case, loginEmail, password) => {
      expect(() =>
        parseAdminBootstrapEnvironment({
          BOOTSTRAP_ADMIN_NAME: 'Administrador Inicial',
          BOOTSTRAP_ADMIN_PHONE: '11987654321',
          BOOTSTRAP_ADMIN_CONTACT_EMAIL: `contact@${testEmailDomain}`,
          BOOTSTRAP_ADMIN_LOGIN_EMAIL: loginEmail,
          BOOTSTRAP_ADMIN_PASSWORD: password,
        }),
      ).toThrow(AdminBootstrapConfigurationError);
      await expect(database.funcionario.count()).resolves.toBe(0);
      await expect(database.usuario.count()).resolves.toBe(0);
    },
  );

  it('rolls back the employee when PostgreSQL rejects the user creation', async () => {
    const input = createInput();

    await database.$executeRawUnsafe(`
      CREATE FUNCTION ${failureFunctionName}() RETURNS trigger AS $function$
      BEGIN
        RAISE EXCEPTION 'forced bootstrap user failure';
      END;
      $function$ LANGUAGE plpgsql
    `);
    await database.$executeRawUnsafe(`
      CREATE TRIGGER ${failureTriggerName}
      BEFORE INSERT ON usuario
      FOR EACH ROW EXECUTE FUNCTION ${failureFunctionName}()
    `);

    await expect(service.createFirstAdministrator(input)).rejects.toThrow();
    await expect(
      database.funcionario.count({ where: { email: input.email } }),
    ).resolves.toBe(0);
    await expect(database.usuario.count()).resolves.toBe(0);
  });

  it('allows only one first administrator across concurrent PostgreSQL transactions', async () => {
    let releaseLock!: () => void;
    let confirmLock!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      confirmLock = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const blocker = database.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          ${ADMIN_BOOTSTRAP_LOCK.namespace},
          ${ADMIN_BOOTSTRAP_LOCK.operation}
        )::text
      `;
      confirmLock();
      await release;
    });

    await lockAcquired;
    const attemptsPromise = Promise.allSettled([
      service.createFirstAdministrator(createInput()),
      service.createFirstAdministrator(createInput()),
    ]);
    await waitForBootstrapLockWaiters(2);
    releaseLock();
    await blocker;
    const attempts = await attemptsPromise;
    const fulfilled = attempts.filter(
      (attempt) => attempt.status === 'fulfilled',
    );
    const rejected = attempts.filter(
      (attempt) => attempt.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: expect.any(AdminBootstrapAlreadyInitializedError),
    });
    await expect(database.usuario.count()).resolves.toBe(1);
    await expect(
      database.funcionario.count({
        where: { email: { endsWith: `@${testEmailDomain}` } },
      }),
    ).resolves.toBe(1);
  });
});
