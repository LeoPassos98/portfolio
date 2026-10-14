import { createHash, randomUUID } from 'node:crypto';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import type { Store } from 'express-session';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../app.module.js';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { DatabaseService } from '../database/database.service.js';
import { PRINCIPAL_ENVIRONMENT_ID } from '../environments/principal-environment.js';
import {
  DemoDataMode,
  DemoStatus,
  Perfil,
  TipoEnvironment,
} from '../generated/prisma/client.js';
import { DemoCredentialsService } from './demo-credentials.service.js';
import { DemoOriginService } from './demo-origin.service.js';
import { DemoAdmissionLockService } from './demo-admission-lock.service.js';
import { DemoSeedService } from './demo-seed.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run DEMO access tests.');
}

const frontendOrigin = 'http://localhost:5173';

type CsrfAgent = {
  agent: SuperAgentTest;
  csrfToken: string;
  sessionId: string;
};

function getSessionId(cookie: string | undefined): string {
  if (!cookie) throw new Error('Expected a session cookie.');

  const cookieValue = cookie.split(';', 1)[0]?.replace('connect.sid=', '');
  const signedSessionId = decodeURIComponent(cookieValue ?? '');
  const sessionId = signedSessionId.slice(2).split('.', 1)[0];

  if (!signedSessionId.startsWith('s:') || !sessionId) {
    throw new Error('Expected a signed session identifier.');
  }

  return sessionId;
}

function syntheticOrigin(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

describe('DEMO access generation and first login', () => {
  let app: Express;
  let database: DatabaseService;
  let credentials: DemoCredentialsService;
  let nestApplication: INestApplication;
  let originIpHash: string;
  let passwordService: PasswordService;
  let testingModule: TestingModule;
  const trackedOrigins = new Set<string>();
  const sessionIds = new Set<string>();
  const principalUserIds = new Set<string>();
  const principalEmployeeIds = new Set<string>();

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();
    const sessions = nestApplication.get(SessionStoreService);
    nestApplication.use(sessions.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions(frontendOrigin));
    await nestApplication.init();

    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    credentials = nestApplication.get(DemoCredentialsService);
    passwordService = nestApplication.get(PasswordService);
    originIpHash = nestApplication
      .get(DemoOriginService)
      .hashRequestIp('127.0.0.1');
    trackedOrigins.add(originIpHash);
    trackedOrigins.add(syntheticOrigin('global-expired'));
    trackedOrigins.add(syntheticOrigin('global-pending'));
    for (let index = 0; index < 50; index += 1) {
      trackedOrigins.add(syntheticOrigin(`global-active-${index}`));
    }
    await cleanupFixtures();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupFixtures();
  });

  afterAll(async () => {
    await nestApplication.close();
  });

  async function cleanupFixtures(): Promise<void> {
    if (sessionIds.size > 0) {
      await database.session.deleteMany({
        where: { sid: { in: [...sessionIds] } },
      });
    }

    const environments = await database.environment.findMany({
      where: { originIpHash: { in: [...trackedOrigins] } },
      select: { id: true },
    });
    const environmentIds = environments.map(({ id }) => id);

    if (environmentIds.length > 0) {
      const users = await database.usuario.findMany({
        where: { environmentId: { in: environmentIds } },
        select: { id: true },
      });
      const userIds = users.map(({ id }) => id);

      if (userIds.length > 0) {
        await database.session.deleteMany({
          where: {
            OR: userIds.map((id) => ({
              sess: { path: ['usuarioId'], equals: id },
            })),
          },
        });
      }

      await database.historicoOrdemServico.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.ordemServico.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.usuario.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.funcionario.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.cliente.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.contadorOrdemServico.deleteMany({
        where: { environmentId: { in: environmentIds } },
      });
      await database.environment.deleteMany({
        where: { id: { in: environmentIds } },
      });
    }

    await database.demoGenerationAttempt.deleteMany({
      where: { originIpHash: { in: [...trackedOrigins] } },
    });

    if (principalUserIds.size > 0) {
      await database.usuario.deleteMany({
        where: { id: { in: [...principalUserIds] } },
      });
      await database.funcionario.deleteMany({
        where: { id: { in: [...principalEmployeeIds] } },
      });
    }

    trackedOrigins.clear();
    trackedOrigins.add(originIpHash);
    sessionIds.clear();
    principalUserIds.clear();
    principalEmployeeIds.clear();
  }

  async function createCsrfAgent(): Promise<CsrfAgent> {
    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sessionId = getSessionId(response.headers['set-cookie']?.[0]);

    sessionIds.add(sessionId);

    return {
      agent,
      csrfToken: response.body.csrfToken as string,
      sessionId,
    };
  }

  function postAccess(
    csrf: CsrfAgent,
    dataMode: DemoDataMode = DemoDataMode.EXEMPLO,
    tutorialEnabled = true,
  ) {
    return csrf.agent
      .post('/demo/access')
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({ dataMode, tutorialEnabled });
  }

  async function createDemoEnvironment(
    options: {
      origin?: string;
      status?: DemoStatus;
      createdSecondsAgo?: number;
      expiresSecondsFromNow?: number;
      dataMode?: DemoDataMode;
    } = {},
  ) {
    const fixtureOrigin = options.origin ?? originIpHash;
    const status = options.status ?? DemoStatus.PENDENTE;
    const environmentId = randomUUID();
    const createdSecondsAgo = options.createdSecondsAgo ?? 0;
    const expiresSecondsFromNow = options.expiresSecondsFromNow;

    trackedOrigins.add(fixtureOrigin);

    await database.$executeRaw`
      WITH fixture_time AS (
        SELECT CASE
          WHEN ${expiresSecondsFromNow ?? null}::integer IS NULL
            THEN statement_timestamp()
              - make_interval(secs => ${createdSecondsAgo})
          ELSE statement_timestamp()
            + make_interval(secs => ${expiresSecondsFromNow ?? 0})
            - INTERVAL '24 hours'
        END AS "criadoEm"
      )
      INSERT INTO "environment" (
        "id",
        "tipo",
        "criado_em",
        "expires_at",
        "demo_status",
        "demo_data_mode",
        "tutorial_enabled",
        "origin_ip_hash",
        "provisioned_at"
      )
      SELECT
        ${environmentId}::uuid,
        'DEMO',
        "criadoEm",
        "criadoEm" + INTERVAL '24 hours',
        ${status}::"demo_status",
        ${options.dataMode ?? DemoDataMode.EXEMPLO}::"demo_data_mode",
        TRUE,
        ${fixtureOrigin},
        CASE WHEN ${status} = 'PRONTA' THEN "criadoEm" ELSE NULL END
      FROM fixture_time
    `;

    return environmentId;
  }

  async function createCollidingPrincipalUser(login: string): Promise<void> {
    const funcionario = await database.funcionario.create({
      data: {
        environmentId: PRINCIPAL_ENVIRONMENT_ID,
        nome: `Colisão ${randomUUID()}`,
        telefone: '31900000000',
        email: `${randomUUID()}@example.test`,
      },
    });
    const usuario = await database.usuario.create({
      data: {
        environmentId: PRINCIPAL_ENVIRONMENT_ID,
        emailLogin: login,
        senhaHash: await passwordService.hash('senha-existente'),
        perfil: Perfil.FUNCIONARIO,
        ativo: true,
        deveAlterarSenha: false,
        funcionarioId: funcionario.id,
      },
    });

    principalEmployeeIds.add(funcionario.id);
    principalUserIds.add(usuario.id);
  }

  it.each([
    [DemoDataMode.EXEMPLO, true],
    [DemoDataMode.VAZIO, false],
  ])(
    'creates only the atomic %s shell and keeps the CSRF session anonymous',
    async (dataMode, tutorialEnabled) => {
      const csrf = await createCsrfAgent();
      const response = await postAccess(csrf, dataMode, tutorialEnabled).expect(
        HttpStatus.CREATED,
      );
      const usuario = await database.usuario.findUniqueOrThrow({
        where: { emailLogin: response.body.login as string },
        include: { funcionario: true, environment: true },
      });
      const counter = await database.contadorOrdemServico.findUniqueOrThrow({
        where: { environmentId: usuario.environmentId },
      });
      const [environmentTimes] = await database.$queryRaw<
        Array<{ criadoEmEpochMs: bigint; expiresAtEpochMs: bigint }>
      >`
        SELECT
          FLOOR(EXTRACT(EPOCH FROM "criado_em") * 1000)::bigint
            AS "criadoEmEpochMs",
          FLOOR(EXTRACT(EPOCH FROM "expires_at") * 1000)::bigint
            AS "expiresAtEpochMs"
        FROM "environment"
        WHERE "id" = ${usuario.environmentId}::uuid
      `;
      const anonymousSession = await database.session.findUniqueOrThrow({
        where: { sid: csrf.sessionId },
      });

      expect(response.body).toEqual({
        login: expect.stringMatching(/^demo-[a-z2-9]{10}@leonardopassos\.com$/),
        password: expect.stringMatching(/^senhadademo-[a-z2-9]{12}$/),
        activationExpiresAt: expect.any(String),
        expiresAt: expect.any(String),
      });
      expect(Object.keys(response.body).sort()).toEqual([
        'activationExpiresAt',
        'expiresAt',
        'login',
        'password',
      ]);
      expect(usuario.environment).toMatchObject({
        tipo: TipoEnvironment.DEMO,
        demoStatus: DemoStatus.PENDENTE,
        demoDataMode: dataMode,
        tutorialEnabled,
        originIpHash,
        provisionedAt: null,
      });
      expect(
        Number(environmentTimes.expiresAtEpochMs) -
          Number(environmentTimes.criadoEmEpochMs),
      ).toBe(24 * 60 * 60 * 1_000);
      expect(new Date(response.body.activationExpiresAt).getTime()).toBe(
        Number(environmentTimes.criadoEmEpochMs) + 60 * 60 * 1_000,
      );
      expect(response.body.expiresAt).toBe(
        new Date(Number(environmentTimes.expiresAtEpochMs)).toISOString(),
      );
      expect(usuario.funcionario).toMatchObject({
        nome: 'Administrador Demo',
        telefone: '31900000000',
        email: response.body.login,
        ativo: true,
      });
      expect(usuario).toMatchObject({
        perfil: Perfil.ADMINISTRADOR,
        ativo: true,
        deveAlterarSenha: false,
      });
      expect(usuario.senhaHash).not.toBe(response.body.password);
      await expect(
        passwordService.verify(usuario.senhaHash, response.body.password),
      ).resolves.toBe(true);
      expect(counter.ultimoNumero).toBe(0);
      await expect(
        database.funcionario.count({
          where: { environmentId: usuario.environmentId },
        }),
      ).resolves.toBe(1);
      await expect(
        database.cliente.count({
          where: { environmentId: usuario.environmentId },
        }),
      ).resolves.toBe(0);
      await expect(
        database.ordemServico.count({
          where: { environmentId: usuario.environmentId },
        }),
      ).resolves.toBe(0);
      await expect(
        database.historicoOrdemServico.count({
          where: { environmentId: usuario.environmentId },
        }),
      ).resolves.toBe(0);
      expect(anonymousSession.sess).toMatchObject({
        csrfToken: csrf.csrfToken,
      });
      expect(anonymousSession.sess).not.toHaveProperty('usuarioId');
      await expect(
        database.demoGenerationAttempt.count({ where: { originIpHash } }),
      ).resolves.toBe(1);
    },
  );

  it('keeps CSRF and strict Zod validation on the public endpoint', async () => {
    await request(app)
      .post('/demo/access')
      .send({ dataMode: 'EXEMPLO', tutorialEnabled: true })
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => expect(body.code).toBe('CSRF_INVALID_TOKEN'));

    const csrf = await createCsrfAgent();
    await csrf.agent
      .post('/demo/access')
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({ dataMode: 'EXEMPLO', tutorialEnabled: true, extra: true })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
  });

  it('rejects an incorrect PENDENTE password without activation or seed and rejects an injected session', async () => {
    const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
    const csrf = await createCsrfAgent();
    const generated = await postAccess(csrf).expect(HttpStatus.CREATED);

    await csrf.agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: generated.body.login,
        password: 'incorrect-password',
      })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });

    const persistedSession = await database.session.findUniqueOrThrow({
      where: { sid: csrf.sessionId },
    });
    expect(persistedSession.sess).not.toHaveProperty('usuarioId');

    const generatedUser = await database.usuario.findUniqueOrThrow({
      where: { emailLogin: generated.body.login as string },
      include: { environment: true },
    });
    expect(generatedUser.environment.demoStatus).toBe(DemoStatus.PENDENTE);
    expect(seed).not.toHaveBeenCalled();
    await expect(
      database.cliente.count({
        where: { environmentId: generatedUser.environmentId },
      }),
    ).resolves.toBe(0);
    await database.session.update({
      where: { sid: csrf.sessionId },
      data: {
        sess: {
          ...(persistedSession.sess as Record<string, unknown>),
          usuarioId: generatedUser.id,
        },
      },
    });
    await csrf.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }) => expect(body.code).toBe('AUTH_UNAUTHENTICATED'));
    await expect(
      database.session.findUnique({ where: { sid: csrf.sessionId } }),
    ).resolves.toBeNull();
  });

  async function createLoginFixture(
    options: Parameters<typeof createDemoEnvironment>[0] = {},
  ) {
    const environmentId = await createDemoEnvironment(options);
    const login = `fixture-${randomUUID()}@demo.invalid`;
    const password = 'synthetic-demo-password';
    const employee = await database.funcionario.create({
      data: {
        environmentId,
        nome: 'Administrador Demo',
        telefone: '31900000000',
        email: login,
      },
    });
    const usuario = await database.usuario.create({
      data: {
        environmentId,
        emailLogin: login,
        senhaHash: await passwordService.hash(password),
        perfil: Perfil.ADMINISTRADOR,
        funcionarioId: employee.id,
        deveAlterarSenha: false,
      },
    });
    await database.contadorOrdemServico.create({
      data: { environmentId, ultimoNumero: 0 },
    });
    return { environmentId, usuarioId: usuario.id, login, password };
  }

  function postLogin(
    csrf: CsrfAgent,
    access: { login: string; password: string },
  ) {
    return csrf.agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({ email: access.login, password: access.password });
  }

  async function counts(environmentId: string) {
    const where = { environmentId };
    const [employees, users, clients, orders, history, counter] =
      await Promise.all([
        database.funcionario.count({ where }),
        database.usuario.count({ where }),
        database.cliente.count({ where }),
        database.ordemServico.count({ where }),
        database.historicoOrdemServico.count({ where }),
        database.contadorOrdemServico.findUniqueOrThrow({ where }),
      ]);
    return {
      employees,
      users,
      clients,
      orders,
      history,
      counter: counter.ultimoNumero,
    };
  }

  async function expectAuthenticated(
    csrf: CsrfAgent,
    response: request.Response,
    environmentId: string,
  ) {
    const sid = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.add(sid);
    const session = await database.session.findUniqueOrThrow({
      where: { sid },
    });
    const usuario = await database.usuario.findFirstOrThrow({
      where: { environmentId },
    });
    expect(session.sess).toMatchObject({ usuarioId: usuario.id });
    expect(session.sess).not.toHaveProperty('environmentId');
    await csrf.agent
      .get('/auth/session')
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.id).toBe(usuario.id));
    const environment = await database.environment.findUniqueOrThrow({
      where: { id: environmentId },
    });
    expect(environment.demoStatus).toBe(DemoStatus.PRONTA);
    expect(environment.provisionedAt).toBeInstanceOf(Date);
  }

  it.each([DemoDataMode.VAZIO, DemoDataMode.EXEMPLO])(
    'activates the generated %s shell and creates a normal session only after PRONTA',
    async (dataMode) => {
      const csrf = await createCsrfAgent();
      const generated = await postAccess(csrf, dataMode, false).expect(
        HttpStatus.CREATED,
      );
      const user = await database.usuario.findUniqueOrThrow({
        where: { emailLogin: generated.body.login },
        include: { environment: true },
      });
      const environmentId = user.environmentId;
      const initial = user.environment;
      const seedService = nestApplication.get(DemoSeedService);
      const provision = seedService.provision.bind(seedService);
      const seed = vi
        .spyOn(seedService, 'provision')
        .mockImplementation(async (...args) => {
          const [transaction, environment] = args;
          const state = await transaction.environment.findUniqueOrThrow({
            where: { id: environment.id },
          });
          expect(state.demoStatus).toBe(DemoStatus.PROVISIONANDO);
          expect(state.provisionedAt).toBeNull();
          await provision(...args);
        });
      const loggedIn = await postLogin(csrf, generated.body)
        .expect(({ body }) => expect(body.code).toBeUndefined())
        .expect(HttpStatus.OK);
      await expectAuthenticated(csrf, loggedIn, environmentId);
      expect(seed).toHaveBeenCalledOnce();
      expect(await counts(environmentId)).toEqual(
        dataMode === DemoDataMode.VAZIO
          ? {
              employees: 1,
              users: 1,
              clients: 0,
              orders: 0,
              history: 0,
              counter: 0,
            }
          : {
              employees: 3,
              users: 1,
              clients: 6,
              orders: 8,
              history: 10,
              counter: 8,
            },
      );
      const final = await database.environment.findUniqueOrThrow({
        where: { id: environmentId },
      });
      expect(final.expiresAt).toEqual(initial.expiresAt);
      expect(final.criadoEm).toEqual(initial.criadoEm);
      expect(final.originIpHash).toBe(initial.originIpHash);
      expect(final.tutorialEnabled).toBe(false);
      expect(
        (await database.usuario.findUniqueOrThrow({ where: { id: user.id } }))
          .funcionarioId,
      ).toBe(user.funcionarioId);
      if (dataMode === DemoDataMode.EXEMPLO) {
        const orders = await database.ordemServico.findMany({
          where: { environmentId },
          orderBy: { numero: 'asc' },
          include: {
            cliente: true,
            responsavel: true,
            historicos: {
              orderBy: { versao: 'asc' },
              include: { alteradoPorUsuario: true, responsavel: true },
            },
          },
        });
        expect(orders.map((order) => order.numero)).toEqual(
          Array.from(
            { length: 8 },
            (_, index) => `OS-${String(index + 1).padStart(6, '0')}`,
          ),
        );
        for (const order of orders) {
          expect(order.cliente.environmentId).toBe(environmentId);
          expect(order.responsavel.environmentId).toBe(environmentId);
          expect(order.historicos.map((history) => history.versao)).toEqual(
            Array.from({ length: order.versao - 1 }, (_, index) => index + 1),
          );
          for (const history of order.historicos) {
            expect(history.environmentId).toBe(environmentId);
            expect(history.alteradoPorUsuario.environmentId).toBe(
              environmentId,
            );
            expect(history.responsavel.environmentId).toBe(environmentId);
          }
        }
      }
    },
  );

  it.each([
    [3_601, 'DEMO_ACTIVATION_EXPIRED'],
    [86_401, 'DEMO_EXPIRED'],
  ])(
    'rejects PENDENTE created %s seconds ago after verifying credentials',
    async (createdSecondsAgo, code) => {
      const fixture = await createLoginFixture({ createdSecondsAgo });
      const csrf = await createCsrfAgent();
      const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
      await postLogin(csrf, { ...fixture, password: 'incorrect' })
        .expect(401)
        .expect(({ body }) =>
          expect(body.code).toBe('AUTH_INVALID_CREDENTIALS'),
        );
      await postLogin(csrf, fixture)
        .expect(401)
        .expect(({ body }) => expect(body.code).toBe(code));
      expect(seed).not.toHaveBeenCalled();
      expect(
        (
          await database.environment.findUniqueOrThrow({
            where: { id: fixture.environmentId },
          })
        ).demoStatus,
      ).toBe(DemoStatus.PENDENTE);
      await csrf.agent.get('/auth/session').expect(401);
    },
  );

  it('activates with three pending accesses and uses the stored origin independently of the login network', async () => {
    const fixture = await createLoginFixture({
      origin: syntheticOrigin('another-network'),
      dataMode: DemoDataMode.VAZIO,
    });
    await createDemoEnvironment({ origin: syntheticOrigin('another-network') });
    await createDemoEnvironment({ origin: syntheticOrigin('another-network') });
    const csrf = await createCsrfAgent();
    const response = await postLogin(csrf, fixture).expect(200);
    await expectAuthenticated(csrf, response, fixture.environmentId);
  });

  it.each(['origin', 'global'])(
    'rejects a new activation when active %s capacity filled after generation',
    async (scope) => {
      const origin = syntheticOrigin('persisted-activation-origin');
      const fixture = await createLoginFixture({ origin });
      const limit = scope === 'origin' ? 3 : 50;
      for (let index = 0; index < limit; index += 1)
        await createDemoEnvironment({
          status: DemoStatus.FALHA,
          origin:
            scope === 'origin'
              ? origin
              : syntheticOrigin(`activation-capacity-${index}`),
        });
      const csrf = await createCsrfAgent();
      const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
      const response = await postLogin(csrf, fixture).expect(
        scope === 'origin' ? 429 : 503,
      );
      expect(response.body.code).toBe(
        scope === 'origin'
          ? 'DEMO_ORIGIN_LIMIT_REACHED'
          : 'DEMO_CAPACITY_REACHED',
      );
      expect(response.headers['retry-after']).toBe(
        String(response.body.details.retryAfterSeconds),
      );
      expect(seed).not.toHaveBeenCalled();
      expect(
        (
          await database.environment.findUniqueOrThrow({
            where: { id: fixture.environmentId },
          })
        ).demoStatus,
      ).toBe(DemoStatus.PENDENTE);
      await csrf.agent.get('/auth/session').expect(401);
    },
  );

  it('serializes two first logins, exposes no session while provisioning and seeds once', async () => {
    const fixture = await createLoginFixture();
    const [first, second] = await Promise.all([
      createCsrfAgent(),
      createCsrfAgent(),
    ]);
    const seedService = nestApplication.get(DemoSeedService);
    const provision = seedService.provision.bind(seedService);
    let releaseSeed!: () => void;
    let enteredSeed!: () => void;
    const seedEntered = new Promise<void>((resolve) => {
      enteredSeed = resolve;
    });
    const seedGate = new Promise<void>((resolve) => {
      releaseSeed = resolve;
    });
    const seed = vi
      .spyOn(seedService, 'provision')
      .mockImplementation(async (...args) => {
        enteredSeed();
        await seedGate;
        await provision(...args);
      });
    const locks = nestApplication.get(DemoAdmissionLockService);
    const acquire = locks.acquireGlobalLock.bind(locks);
    let enteredSecondLock!: () => void;
    const secondWaiting = new Promise<void>((resolve) => {
      enteredSecondLock = resolve;
    });
    let lockCalls = 0;
    vi.spyOn(locks, 'acquireGlobalLock').mockImplementation((transaction) => {
      lockCalls += 1;
      if (lockCalls === 2) enteredSecondLock();
      return acquire(transaction);
    });
    const firstLogin = postLogin(first, fixture)
      .expect(200)
      .then((response) => response);
    await seedEntered;
    const secondLogin = postLogin(second, fixture)
      .expect(200)
      .then((response) => response);
    try {
      await secondWaiting;
      expect(seed).toHaveBeenCalledOnce();
      expect(
        (
          await database.environment.findUniqueOrThrow({
            where: { id: fixture.environmentId },
          })
        ).demoStatus,
      ).toBe(DemoStatus.PENDENTE);
      await first.agent.get('/auth/session').expect(401);
      await second.agent.get('/auth/session').expect(401);
    } finally {
      releaseSeed();
    }
    const [a, b] = await Promise.all([firstLogin, secondLogin]);
    await expectAuthenticated(first, a, fixture.environmentId);
    await expectAuthenticated(second, b, fixture.environmentId);
    expect(seed).toHaveBeenCalledOnce();
    expect(await counts(fixture.environmentId)).toEqual({
      employees: 3,
      users: 1,
      clients: 6,
      orders: 8,
      history: 10,
      counter: 8,
    });
  });

  it('rolls back seed data and counter, records FALHA, then retries the same shell once', async () => {
    const fixture = await createLoginFixture();
    const csrf = await createCsrfAgent();
    const service = nestApplication.get(DemoSeedService);
    const provision = service.provision.bind(service);
    const seed = vi
      .spyOn(service, 'provision')
      .mockImplementationOnce(async (...args) => {
        await provision(...args);
        // A real SQL error aborts the subtransaction; SAVEPOINT must recover it.
        await args[0].contadorOrdemServico.create({
          data: { environmentId: args[1].id, ultimoNumero: 0 },
        });
      });
    await postLogin(csrf, fixture)
      .expect(503)
      .expect(({ body }) => expect(body.code).toBe('DEMO_PROVISIONING_FAILED'));
    expect(
      (
        await database.environment.findUniqueOrThrow({
          where: { id: fixture.environmentId },
        })
      ).demoStatus,
    ).toBe(DemoStatus.FALHA);
    expect(await counts(fixture.environmentId)).toEqual({
      employees: 1,
      users: 1,
      clients: 0,
      orders: 0,
      history: 0,
      counter: 0,
    });
    await csrf.agent.get('/auth/session').expect(401);
    const response = await postLogin(csrf, fixture).expect(200);
    await expectAuthenticated(csrf, response, fixture.environmentId);
    expect(seed).toHaveBeenCalledTimes(2);
    expect(await counts(fixture.environmentId)).toEqual({
      employees: 3,
      users: 1,
      clients: 6,
      orders: 8,
      history: 10,
      counter: 8,
    });
  });

  it.each(['origin', 'global'] as const)(
    'commits FALHA while a concurrent activation waits for the last %s slot',
    async (limit) => {
      const origin = syntheticOrigin(`failure-last-${limit}`);
      const failing = await createLoginFixture({ origin });
      const competing = await createLoginFixture({
        origin:
          limit === 'origin' ? origin : syntheticOrigin('competing-origin'),
      });
      const existing = limit === 'origin' ? 2 : 49;
      for (let index = 0; index < existing; index += 1) {
        await createDemoEnvironment({
          status: DemoStatus.FALHA,
          origin:
            limit === 'origin'
              ? origin
              : syntheticOrigin(`failure-last-active-${index}`),
        });
      }
      const [first, second] = await Promise.all([
        createCsrfAgent(),
        createCsrfAgent(),
      ]);
      const service = nestApplication.get(DemoSeedService);
      const provision = service.provision.bind(service);
      let enterSeed!: () => void;
      let releaseSeed!: () => void;
      const seedEntered = new Promise<void>((resolve) => {
        enterSeed = resolve;
      });
      const seedGate = new Promise<void>((resolve) => {
        releaseSeed = resolve;
      });
      const seed = vi
        .spyOn(service, 'provision')
        .mockImplementationOnce(async (...args) => {
          await provision(...args);
          enterSeed();
          await seedGate;
          await args[0].contadorOrdemServico.create({
            data: { environmentId: failing.environmentId, ultimoNumero: 0 },
          });
        });
      const locks = nestApplication.get(DemoAdmissionLockService);
      const acquire = locks.acquireGlobalLock.bind(locks);
      let secondWaiting!: () => void;
      const waiting = new Promise<void>((resolve) => {
        secondWaiting = resolve;
      });
      let attempts = 0;
      vi.spyOn(locks, 'acquireGlobalLock').mockImplementation((transaction) => {
        attempts += 1;
        if (attempts === 2) secondWaiting();
        return acquire(transaction);
      });
      const firstLogin = postLogin(first, failing)
        .expect(503)
        .then((response) => response);
      await seedEntered;
      const secondLogin = postLogin(second, competing)
        .expect(limit === 'origin' ? 429 : 503)
        .then((response) => response);
      try {
        await waiting;
        expect(seed).toHaveBeenCalledOnce();
      } finally {
        releaseSeed();
      }
      const [failed, blocked] = await Promise.all([firstLogin, secondLogin]);
      expect(failed.body.code).toBe('DEMO_PROVISIONING_FAILED');
      expect(blocked.body.code).toBe(
        limit === 'origin'
          ? 'DEMO_ORIGIN_LIMIT_REACHED'
          : 'DEMO_CAPACITY_REACHED',
      );
      expect(seed).toHaveBeenCalledOnce();
      expect(attempts).toBe(2);
      for (const [fixture, status] of [
        [failing, DemoStatus.FALHA],
        [competing, DemoStatus.PENDENTE],
      ] as const) {
        const environment = await database.environment.findUniqueOrThrow({
          where: { id: fixture.environmentId },
        });
        expect(environment.demoStatus).toBe(status);
        expect(environment.provisionedAt).toBeNull();
        expect(await counts(fixture.environmentId)).toEqual({
          employees: 1,
          users: 1,
          clients: 0,
          orders: 0,
          history: 0,
          counter: 0,
        });
      }
      expect(
        await database.environment.count({
          where: {
            tipo: TipoEnvironment.DEMO,
            demoStatus: {
              in: [
                DemoStatus.PROVISIONANDO,
                DemoStatus.FALHA,
                DemoStatus.PRONTA,
              ],
            },
            ...(limit === 'origin' ? { originIpHash: origin } : {}),
          },
        }),
      ).toBe(limit === 'origin' ? 3 : 50);
      await first.agent.get('/auth/session').expect(401);
      await second.agent.get('/auth/session').expect(401);
    },
  );

  it('retries FALHA after one hour with both active capacity limits full, without reserving again', async () => {
    const origin = syntheticOrigin('retry-full-origin');
    const fixture = await createLoginFixture({
      origin,
      status: DemoStatus.FALHA,
      createdSecondsAgo: 7_200,
    });
    for (let index = 0; index < 49; index += 1)
      await createDemoEnvironment({
        status: DemoStatus.FALHA,
        origin: index < 2 ? origin : syntheticOrigin(`retry-active-${index}`),
      });
    const csrf = await createCsrfAgent();
    const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
    const response = await postLogin(csrf, fixture).expect(200);
    await expectAuthenticated(csrf, response, fixture.environmentId);
    expect(seed).toHaveBeenCalledOnce();
    expect(
      await database.environment.count({
        where: {
          tipo: TipoEnvironment.DEMO,
          demoStatus: {
            in: [DemoStatus.PROVISIONANDO, DemoStatus.FALHA, DemoStatus.PRONTA],
          },
        },
      }),
    ).toBe(50);
  });

  it('preserves FALHA and no partial data when a retry fails', async () => {
    const fixture = await createLoginFixture({
      status: DemoStatus.FALHA,
      createdSecondsAgo: 7_200,
    });
    const csrf = await createCsrfAgent();
    const service = nestApplication.get(DemoSeedService);
    const provision = service.provision.bind(service);
    vi.spyOn(service, 'provision').mockImplementationOnce(async (...args) => {
      await provision(...args);
      throw new Error('Intentional retry failure');
    });
    await postLogin(csrf, fixture).expect(503);
    const environment = await database.environment.findUniqueOrThrow({
      where: { id: fixture.environmentId },
    });
    expect(environment.demoStatus).toBe(DemoStatus.FALHA);
    expect(environment.provisionedAt).toBeNull();
    expect(await counts(fixture.environmentId)).toEqual({
      employees: 1,
      users: 1,
      clients: 0,
      orders: 0,
      history: 0,
      counter: 0,
    });
    await csrf.agent.get('/auth/session').expect(401);
  });

  it('does not reprovision after session.save fails for an already completed DEMO', async () => {
    const fixture = await createLoginFixture();
    const csrf = await createCsrfAgent();
    const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
    const { store } = nestApplication.get(SessionStoreService) as unknown as {
      store: Store;
    };
    const save = store.set.bind(store);
    const set = vi
      .spyOn(store, 'set')
      .mockImplementation((sid, session, callback) => {
        if (session.usuarioId)
          callback?.(new Error('Intentional session persistence failure'));
        else save(sid, session, callback);
      });
    await postLogin(csrf, fixture).expect(500);
    set.mockRestore();
    expect(
      (
        await database.environment.findUniqueOrThrow({
          where: { id: fixture.environmentId },
        })
      ).demoStatus,
    ).toBe(DemoStatus.PRONTA);
    expect(
      await database.session.count({
        where: { sess: { path: ['usuarioId'], equals: fixture.usuarioId } },
      }),
    ).toBe(0);
    const retry = await createCsrfAgent();
    const response = await postLogin(retry, fixture).expect(200);
    await expectAuthenticated(retry, response, fixture.environmentId);
    expect(seed).toHaveBeenCalledOnce();
    expect(await counts(fixture.environmentId)).toEqual({
      employees: 3,
      users: 1,
      clients: 6,
      orders: 8,
      history: 10,
      counter: 8,
    });
  });

  it.each([DemoStatus.FALHA, DemoStatus.PRONTA])(
    'rejects an expired %s even with a correct password',
    async (status) => {
      const fixture = await createLoginFixture({
        status,
        expiresSecondsFromNow: -1,
      });
      const csrf = await createCsrfAgent();
      const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
      await postLogin(csrf, fixture)
        .expect(401)
        .expect(({ body }) => expect(body.code).toBe('DEMO_EXPIRED'));
      await csrf.agent.get('/auth/session').expect(401);
      expect(seed).not.toHaveBeenCalled();
    },
  );

  it.each([DemoStatus.PRONTA, DemoStatus.PROVISIONANDO])(
    'handles an existing %s without executing another seed',
    async (status) => {
      const fixture = await createLoginFixture({
        status,
        createdSecondsAgo: 7_200,
      });
      const csrf = await createCsrfAgent();
      const seed = vi.spyOn(nestApplication.get(DemoSeedService), 'provision');
      const response = await postLogin(csrf, fixture).expect(
        status === DemoStatus.PRONTA ? 200 : 409,
      );
      if (status === DemoStatus.PRONTA)
        await expectAuthenticated(csrf, response, fixture.environmentId);
      else {
        expect(response.body.code).toBe('DEMO_PROVISIONING_IN_PROGRESS');
        await csrf.agent.get('/auth/session').expect(401);
      }
      expect(seed).not.toHaveBeenCalled();
    },
  );

  it.each([
    DemoStatus.PENDENTE,
    DemoStatus.PROVISIONANDO,
    DemoStatus.FALHA,
    DemoStatus.PRONTA,
  ])(
    'destroys an injected session for invalid DEMO context %s',
    async (status) => {
      const fixture = await createLoginFixture({
        status,
        ...(status === DemoStatus.PRONTA ? { expiresSecondsFromNow: -1 } : {}),
      });
      const csrf = await createCsrfAgent();
      const session = await database.session.findUniqueOrThrow({
        where: { sid: csrf.sessionId },
      });
      await database.session.update({
        where: { sid: csrf.sessionId },
        data: {
          sess: {
            ...(session.sess as Record<string, unknown>),
            usuarioId: fixture.usuarioId,
          },
        },
      });
      await csrf.agent
        .get('/auth/session')
        .expect(401)
        .expect(({ body }) => expect(body.code).toBe('AUTH_UNAUTHENTICATED'));
      await expect(
        database.session.findUnique({ where: { sid: csrf.sessionId } }),
      ).resolves.toBeNull();
    },
  );

  it('blocks three valid PENDENTEs before rate limit and ignores an expired activation window', async () => {
    await createDemoEnvironment({ createdSecondsAgo: 3_700 });
    await Promise.all([
      createDemoEnvironment({ createdSecondsAgo: 30 }),
      createDemoEnvironment({ createdSecondsAgo: 20 }),
      createDemoEnvironment({ createdSecondsAgo: 10 }),
    ]);
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(response.body).toMatchObject({
      code: 'DEMO_PENDING_LIMIT_REACHED',
      details: {
        current: 3,
        limit: 3,
        retryAfterSeconds: expect.any(Number),
      },
    });
    expect(response.headers['retry-after']).toBe(
      String(response.body.details.retryAfterSeconds),
    );
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
    await expect(
      database.environment.count({
        where: { originIpHash, demoStatus: DemoStatus.PENDENTE },
      }),
    ).resolves.toBe(4);
  });

  it('blocks three non-expired active DEMOs by origin and ignores an expired active DEMO', async () => {
    await createDemoEnvironment({
      status: DemoStatus.PRONTA,
      expiresSecondsFromNow: -10,
    });
    await Promise.all([
      createDemoEnvironment({ status: DemoStatus.PROVISIONANDO }),
      createDemoEnvironment({ status: DemoStatus.FALHA }),
      createDemoEnvironment({ status: DemoStatus.PRONTA }),
    ]);
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(response.body).toMatchObject({
      code: 'DEMO_ORIGIN_LIMIT_REACHED',
      details: { current: 3, limit: 3 },
    });
    expect(response.headers['retry-after']).toBe(
      String(response.body.details.retryAfterSeconds),
    );
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
  });

  it('blocks fifty non-expired active DEMOs globally without counting PENDENTE or expired rows', async () => {
    await createDemoEnvironment({
      origin: syntheticOrigin('global-expired'),
      status: DemoStatus.FALHA,
      expiresSecondsFromNow: -10,
    });
    await createDemoEnvironment({
      origin: syntheticOrigin('global-pending'),
      status: DemoStatus.PENDENTE,
    });
    await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        createDemoEnvironment({
          origin: syntheticOrigin(`global-active-${index}`),
          status: DemoStatus.FALHA,
        }),
      ),
    );
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    expect(response.body).toMatchObject({
      code: 'DEMO_CAPACITY_REACHED',
      details: { current: 50, limit: 50 },
    });
    expect(response.headers['retry-after']).toBe(
      String(response.body.details.retryAfterSeconds),
    );
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
  });

  it('blocks a prepared rate window without hashing a password or inserting a fourth attempt', async () => {
    const referenceTime = new Date();
    await database.demoGenerationAttempt.createMany({
      data: [1, 2, 3].map((offset) => ({
        originIpHash,
        createdAt: new Date(referenceTime.getTime() - offset * 1_000),
      })),
    });
    const hashSpy = vi.spyOn(passwordService, 'hash');
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(response.body).toMatchObject({
      code: 'DEMO_GENERATION_RATE_LIMITED',
      details: {
        current: 3,
        limit: 3,
        windowSeconds: 60,
        retryAfterSeconds: expect.any(Number),
      },
    });
    expect(response.headers['retry-after']).toBe(
      String(response.body.details.retryAfterSeconds),
    );
    expect(hashSpy).not.toHaveBeenCalled();
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(3);
    await expect(
      database.environment.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
  });

  it('serializes admission so two concurrent requests cannot create a fourth PENDENTE', async () => {
    await Promise.all([
      createDemoEnvironment({ createdSecondsAgo: 20 }),
      createDemoEnvironment({ createdSecondsAgo: 10 }),
    ]);
    const [csrfA, csrfB] = await Promise.all([
      createCsrfAgent(),
      createCsrfAgent(),
    ]);
    const responses = await Promise.all([postAccess(csrfA), postAccess(csrfB)]);

    expect(responses.map(({ status }) => status).sort()).toEqual([
      HttpStatus.CREATED,
      HttpStatus.TOO_MANY_REQUESTS,
    ]);
    expect(
      responses.find(({ status }) => status === HttpStatus.TOO_MANY_REQUESTS)
        ?.body.code,
    ).toBe('DEMO_PENDING_LIMIT_REACHED');
    await expect(
      database.environment.count({
        where: { originIpHash, demoStatus: DemoStatus.PENDENTE },
      }),
    ).resolves.toBe(3);
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(1);
  });

  it('rolls back a colliding login and retries only the identifier', async () => {
    const collidingLogin = 'demo-abcdefghij@leonardopassos.com';
    const finalLogin = 'demo-jihgfedcba@leonardopassos.com';
    const password = 'senhadademo-abcdefghij23';
    await createCollidingPrincipalUser(collidingLogin);
    const loginSpy = vi
      .spyOn(credentials, 'generateLogin')
      .mockReturnValueOnce(collidingLogin)
      .mockReturnValueOnce(finalLogin);
    vi.spyOn(credentials, 'generatePassword').mockReturnValue(password);
    const hashSpy = vi.spyOn(passwordService, 'hash');
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(HttpStatus.CREATED);

    expect(response.body.login).toBe(finalLogin);
    expect(response.body.password).toBe(password);
    expect(loginSpy).toHaveBeenCalledTimes(2);
    expect(hashSpy).toHaveBeenCalledTimes(1);
    await expect(
      database.environment.count({ where: { originIpHash } }),
    ).resolves.toBe(1);
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(1);
  });

  it('sanitizes five login collisions and leaves no shell or rate attempt', async () => {
    const collidingLogin = 'demo-abcdefghij@leonardopassos.com';
    const password = 'senhadademo-abcdefghij23';
    await createCollidingPrincipalUser(collidingLogin);
    const loginSpy = vi
      .spyOn(credentials, 'generateLogin')
      .mockReturnValue(collidingLogin);
    vi.spyOn(credentials, 'generatePassword').mockReturnValue(password);
    const csrf = await createCsrfAgent();
    const response = await postAccess(csrf).expect(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    expect(response.body).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
    expect(JSON.stringify(response.body)).not.toContain(collidingLogin);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(loginSpy).toHaveBeenCalledTimes(5);
    await expect(
      database.environment.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
    await expect(
      database.demoGenerationAttempt.count({ where: { originIpHash } }),
    ).resolves.toBe(0);
  });
});
