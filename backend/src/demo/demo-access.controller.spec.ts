import { createHash, randomUUID } from 'node:crypto';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
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

describe('POST /demo/access', () => {
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
        'EXEMPLO',
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

  it('does not allow the generated PENDENTE credentials through normal login', async () => {
    const csrf = await createCsrfAgent();
    const generated = await postAccess(csrf).expect(HttpStatus.CREATED);

    await csrf.agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrf.csrfToken)
      .send({
        email: generated.body.login,
        password: generated.body.password,
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
      select: { id: true },
    });
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
