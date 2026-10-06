import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service.js';
import {
  DemoAdmissionLockService,
  demoGlobalAdvisoryLockKey,
} from '../demo/demo-admission-lock.service.js';
import { PRINCIPAL_ENVIRONMENT_ID } from '../environments/principal-environment.js';
import { DemoStatus, type Prisma } from '../generated/prisma/client.js';
import {
  DemoCleanupModule,
  demoCleanupEnvironmentSchema,
} from './demo-cleanup.module.js';
import {
  DEMO_CLEANUP_BATCH_SIZE,
  DEMO_CLEANUP_GRACE_SECONDS,
  DEMO_GENERATION_ATTEMPT_RETENTION_SECONDS,
  DemoCleanupService,
} from './demo-cleanup.service.js';

const testDomain = 'cleanup.example.test';
const originIpHash = 'c'.repeat(64);
let application: TestingModule;
let database: DatabaseService;
let service: DemoCleanupService;
let locks: DemoAdmissionLockService;
let environmentIds: string[];
let sessionIds: string[];
let attemptIds: string[];
let employeeIds: string[];
let clientIds: string[];
let orderIds: string[];

async function createDemo(
  expiredSecondsAgo: number,
  status: DemoStatus = DemoStatus.PENDENTE,
): Promise<string> {
  const id = randomUUID();
  environmentIds.push(id);
  // Fixtures honor immutable expiration = creation + 24h using database time.
  await database.$executeRaw`
    INSERT INTO "environment" (
      "id", "tipo", "criado_em", "expires_at", "demo_status",
      "demo_data_mode", "tutorial_enabled", "origin_ip_hash", "provisioned_at"
    ) VALUES (
      ${id}::uuid, 'DEMO',
      statement_timestamp() - make_interval(secs => ${expiredSecondsAgo}) - INTERVAL '24 hours',
      statement_timestamp() - make_interval(secs => ${expiredSecondsAgo}),
      ${status}::demo_status, 'VAZIO', false, ${originIpHash},
      CASE WHEN ${status}::demo_status = 'PRONTA' THEN statement_timestamp() ELSE NULL END
    )
  `;
  return id;
}

async function createGraph(environmentId: string) {
  const employee = await database.funcionario.create({
    data: {
      environmentId,
      nome: 'Funcionário cleanup',
      telefone: '11999999999',
      email: `${randomUUID()}@${testDomain}`,
    },
  });
  employeeIds.push(employee.id);
  const user = await database.usuario.create({
    data: {
      environmentId,
      funcionarioId: employee.id,
      emailLogin: `${randomUUID()}@${testDomain}`,
      senhaHash: 'artificial test hash',
      perfil: 'ADMINISTRADOR',
    },
  });
  const client = await database.cliente.create({
    data: {
      environmentId,
      nome: 'Cliente cleanup',
      telefone: '11999999999',
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    },
  });
  clientIds.push(client.id);
  const order = await database.ordemServico.create({
    data: {
      environmentId,
      clienteId: client.id,
      responsavelId: employee.id,
      numero: randomUUID(),
      descricao: 'Ordem cleanup',
      valor: 10,
    },
  });
  orderIds.push(order.id);
  await database.historicoOrdemServico.create({
    data: {
      environmentId,
      ordemServicoId: order.id,
      responsavelId: employee.id,
      alteradoPorUsuarioId: user.id,
      versao: 1,
      descricao: order.descricao,
      valor: order.valor,
      status: order.status,
      visibilidade: order.visibilidade,
    },
  });
  await database.contadorOrdemServico.upsert({
    where: { environmentId },
    create: { environmentId, ultimoNumero: 1 },
    update: {},
  });
  return user.id;
}

async function createSession(sess: Prisma.InputJsonObject): Promise<string> {
  const sid = randomUUID();
  sessionIds.push(sid);
  await database.session.create({
    data: { sid, sess, expire: new Date('2099-01-01T00:00:00Z') },
  });
  return sid;
}

async function readGraph(environmentId: string) {
  const where = { environmentId };
  return {
    environment: await database.environment.findUnique({
      where: { id: environmentId },
    }),
    clients: await database.cliente.findMany({ where }),
    employees: await database.funcionario.findMany({ where }),
    users: await database.usuario.findMany({ where }),
    orders: await database.ordemServico.findMany({ where }),
    history: await database.historicoOrdemServico.findMany({ where }),
    counter: await database.contadorOrdemServico.findMany({ where }),
  };
}

function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function waitForGlobalLockWaiter(): Promise<void> {
  const unsignedKey = BigInt.asUintN(64, demoGlobalAdvisoryLockKey());
  const classId = Number(unsignedKey >> 32n);
  const objectId = Number(unsignedKey & 0xffffffffn);
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const [result] = await database.$queryRaw<Array<{ waiting: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted AND objsubid = 1
          AND classid = ${classId}::oid AND objid = ${objectId}::oid
          AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
      ) AS waiting
    `;
    if (result.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for the shared DEMO global lock');
}

async function dropFailureTrigger(): Promise<void> {
  await database.$executeRaw`DROP TRIGGER IF EXISTS demo_cleanup_test_failure ON "environment"`;
  await database.$executeRaw`DROP FUNCTION IF EXISTS demo_cleanup_test_failure()`;
}

describe('DemoCleanupService (portfolio_test)', () => {
  beforeAll(async () => {
    application = await Test.createTestingModule({
      imports: [DemoCleanupModule],
    }).compile();
    await application.init();
    database = application.get(DatabaseService);
    service = application.get(DemoCleanupService);
    locks = application.get(DemoAdmissionLockService);
    const config = application.get(ConfigService);
    expect(new URL(config.getOrThrow('DATABASE_URL')).pathname).toBe(
      '/portfolio_test',
    );
  });

  beforeEach(() => {
    environmentIds = [];
    sessionIds = [];
    attemptIds = [];
    employeeIds = [];
    clientIds = [];
    orderIds = [];
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await dropFailureTrigger();
    await database.session.deleteMany({ where: { sid: { in: sessionIds } } });
    const where = { environmentId: { in: environmentIds } };
    await database.historicoOrdemServico.deleteMany({
      where: { OR: [where, { ordemServicoId: { in: orderIds } }] },
    });
    await database.ordemServico.deleteMany({
      where: { OR: [where, { id: { in: orderIds } }] },
    });
    await database.usuario.deleteMany({
      where: { OR: [where, { emailLogin: { endsWith: `@${testDomain}` } }] },
    });
    await database.cliente.deleteMany({
      where: { OR: [where, { id: { in: clientIds } }] },
    });
    await database.funcionario.deleteMany({
      where: { OR: [where, { id: { in: employeeIds } }] },
    });
    await database.contadorOrdemServico.deleteMany({ where });
    await database.environment.deleteMany({
      where: { id: { in: environmentIds }, tipo: 'DEMO' },
    });
    await database.demoGenerationAttempt.deleteMany({
      where: { id: { in: attemptIds } },
    });
  });

  afterAll(async () => {
    await application.close();
  });

  it('validates only DATABASE_URL, independently of HTTP, session and migration configuration', () => {
    expect(
      demoCleanupEnvironmentSchema.parse({
        DATABASE_URL: process.env.DATABASE_URL,
      }),
    ).toEqual({
      DATABASE_URL: process.env.DATABASE_URL,
    });
    expect(demoCleanupEnvironmentSchema.safeParse({}).success).toBe(false);
    expect(
      demoCleanupEnvironmentSchema.safeParse({ DATABASE_URL: 'invalid' })
        .success,
    ).toBe(false);
  });

  it.each(Object.values(DemoStatus))(
    'physically removes expired %s DEMOs beyond the grace period',
    async (status) => {
      const id = await createDemo(DEMO_CLEANUP_GRACE_SECONDS + 60, status);
      await expect(service.cleanup()).resolves.toEqual({
        environmentsDeleted: 1,
        sessionsDeleted: 0,
        generationAttemptsDeleted: 0,
      });
      await expect(
        database.environment.findUnique({ where: { id } }),
      ).resolves.toBeNull();
    },
  );

  it('preserves recently expired and active DEMOs and the PRINCIPAL', async () => {
    const recentlyExpiredId = await createDemo(DEMO_CLEANUP_GRACE_SECONDS - 60);
    const activeId = await createDemo(-3_600, DemoStatus.PRONTA);
    const before = await Promise.all([
      readGraph(recentlyExpiredId),
      readGraph(activeId),
      readGraph(PRINCIPAL_ENVIRONMENT_ID),
    ]);
    await expect(service.cleanup()).resolves.toEqual({
      environmentsDeleted: 0,
      sessionsDeleted: 0,
      generationAttemptsDeleted: 0,
    });
    expect(
      await Promise.all([
        readGraph(recentlyExpiredId),
        readGraph(activeId),
        readGraph(PRINCIPAL_ENVIRONMENT_ID),
      ]),
    ).toEqual(before);
  });

  it('deletes all dependencies and DEMO user sessions while isolating active DEMO and PRINCIPAL data', async () => {
    const expiredId = await createDemo(7_200, DemoStatus.PRONTA);
    const activeId = await createDemo(-3_600, DemoStatus.PRONTA);
    const expiredUserId = await createGraph(expiredId);
    const activeUserId = await createGraph(activeId);
    // PRINCIPAL counter is preexisting and must remain unchanged.
    const principalUserId = await createGraph(PRINCIPAL_ENVIRONMENT_ID);
    const expiredSid = await createSession({ usuarioId: expiredUserId });
    const anotherExpiredSid = await createSession({
      usuarioId: expiredUserId,
      csrfToken: 'artificial',
    });
    const preservedSids = await Promise.all([
      createSession({ usuarioId: activeUserId }),
      createSession({ usuarioId: principalUserId }),
      createSession({}),
      createSession({ usuarioId: 'not-a-uuid' }),
    ]);
    const activeBefore = await readGraph(activeId);
    const principalWithGraph = await readGraph(PRINCIPAL_ENVIRONMENT_ID);
    await expect(service.cleanup()).resolves.toEqual({
      environmentsDeleted: 1,
      sessionsDeleted: 2,
      generationAttemptsDeleted: 0,
    });
    expect(await readGraph(expiredId)).toEqual({
      environment: null,
      clients: [],
      employees: [],
      users: [],
      orders: [],
      history: [],
      counter: [],
    });
    expect(
      await database.session.count({
        where: { sid: { in: [expiredSid, anotherExpiredSid] } },
      }),
    ).toBe(0);
    expect(
      await database.session.count({ where: { sid: { in: preservedSids } } }),
    ).toBe(preservedSids.length);
    expect(await readGraph(activeId)).toEqual(activeBefore);
    expect(await readGraph(PRINCIPAL_ENVIRONMENT_ID)).toEqual(
      principalWithGraph,
    );
  });

  it('retains recent generation attempts and removes only records older than 24 hours', async () => {
    for (const secondsAgo of [
      DEMO_GENERATION_ATTEMPT_RETENTION_SECONDS + 60,
      DEMO_GENERATION_ATTEMPT_RETENTION_SECONDS - 60,
      30,
    ]) {
      const id = randomUUID();
      attemptIds.push(id);
      await database.$executeRaw`
        INSERT INTO "demo_generation_attempt" ("id", "origin_ip_hash", "created_at")
        VALUES (${id}::uuid, ${originIpHash}, statement_timestamp() - make_interval(secs => ${secondsAgo}))
      `;
    }
    await expect(service.cleanup()).resolves.toEqual({
      environmentsDeleted: 0,
      sessionsDeleted: 0,
      generationAttemptsDeleted: 1,
    });
    expect(
      await database.demoGenerationAttempt.findMany({
        select: { id: true },
        where: { id: { in: attemptIds } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(
      attemptIds
        .slice(1)
        .sort()
        .map((id) => ({ id })),
    );
  });

  it('is idempotent immediately after a successful deletion', async () => {
    await createDemo(7_200);
    expect((await service.cleanup()).environmentsDeleted).toBe(1);
    await expect(service.cleanup()).resolves.toEqual({
      environmentsDeleted: 0,
      sessionsDeleted: 0,
      generationAttemptsDeleted: 0,
    });
  });

  it('commits batches of 100 oldest DEMOs and reacquires the global lock per transaction', async () => {
    const orderedIds: string[] = [];
    for (let index = 0; index <= DEMO_CLEANUP_BATCH_SIZE; index++) {
      orderedIds.push(await createDemo(10_000 - index));
    }
    const remaining: string[][] = [];
    const acquire = locks.acquireGlobalLock.bind(locks);
    const lockSpy = vi
      .spyOn(locks, 'acquireGlobalLock')
      .mockImplementation(async (transaction) => {
        await acquire(transaction);
        const rows = await transaction.environment.findMany({
          where: { id: { in: orderedIds } },
          orderBy: { expiresAt: 'asc' },
          select: { id: true },
        });
        remaining.push(rows.map(({ id }) => id));
      });
    expect((await service.cleanup()).environmentsDeleted).toBe(101);
    expect(remaining).toEqual([orderedIds, orderedIds.slice(100), []]);
    expect(lockSpy).toHaveBeenCalledTimes(3);
    expect(
      new Set(lockSpy.mock.calls.map(([transaction]) => transaction)).size,
    ).toBe(3);
  });

  it('rolls back the entire batch, including sessions and dependencies, on a database delete failure', async () => {
    const id = await createDemo(7_200, DemoStatus.PRONTA);
    const secondId = await createDemo(7_300);
    const userId = await createGraph(id);
    const sid = await createSession({ usuarioId: userId });
    const graphBefore = await readGraph(id);
    await database.$executeRaw`
      CREATE FUNCTION demo_cleanup_test_failure() RETURNS trigger AS $function$
      BEGIN
        RAISE EXCEPTION 'forced cleanup delete failure';
      END;
      $function$ LANGUAGE plpgsql
    `;
    await database.$executeRaw`
      CREATE TRIGGER demo_cleanup_test_failure BEFORE DELETE ON "environment"
      FOR EACH ROW EXECUTE FUNCTION demo_cleanup_test_failure()
    `;
    await expect(service.cleanup()).rejects.toThrow();
    expect(await readGraph(id)).toEqual(graphBefore);
    expect(await database.environment.count({ where: { id: secondId } })).toBe(
      1,
    );
    expect(await database.session.count({ where: { sid } })).toBe(1);
    await dropFailureTrigger();
    expect((await service.cleanup()).environmentsDeleted).toBe(2);
  });

  it('waits for the admission/provisioning global lock before selecting or deleting', async () => {
    const id = await createDemo(7_200);
    const locked = barrier();
    const release = barrier();
    const blocker = database.$transaction(
      async (transaction) => {
        await locks.acquireGlobalLock(transaction);
        locked.resolve();
        await release.promise;
      },
      { timeout: 10_000 },
    );
    await locked.promise;
    const cleanup = service.cleanup();
    const settled = Promise.allSettled([blocker, cleanup]);
    try {
      await waitForGlobalLockWaiter();
      expect(await database.environment.count({ where: { id } })).toBe(1);
    } finally {
      release.resolve();
      await settled;
    }
    await expect(cleanup).resolves.toMatchObject({ environmentsDeleted: 1 });
    await expect(blocker).resolves.toBeUndefined();
  });

  it('holds the shared global lock until the cleanup batch commits, blocking new admission', async () => {
    const id = await createDemo(7_200);
    const locked = barrier();
    const release = barrier();
    const acquire = locks.acquireGlobalLock.bind(locks);
    vi.spyOn(locks, 'acquireGlobalLock').mockImplementationOnce(
      async (transaction) => {
        await acquire(transaction);
        locked.resolve();
        await release.promise;
      },
    );
    const cleanup = service.cleanup();
    await locked.promise;
    const admission = database.$transaction(
      async (transaction) => {
        await new DemoAdmissionLockService().acquireGlobalLock(transaction);
        expect(await transaction.environment.count({ where: { id } })).toBe(0);
      },
      { timeout: 10_000 },
    );
    const settled = Promise.allSettled([cleanup, admission]);
    try {
      await waitForGlobalLockWaiter();
      expect(await database.environment.count({ where: { id } })).toBe(1);
    } finally {
      release.resolve();
      await settled;
    }
    await expect(cleanup).resolves.toMatchObject({ environmentsDeleted: 1 });
    await expect(admission).resolves.toBeUndefined();
  });
});
