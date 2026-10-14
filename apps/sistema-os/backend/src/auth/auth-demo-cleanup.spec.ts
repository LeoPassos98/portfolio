import { randomUUID } from 'node:crypto';
import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Express } from 'express';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { DatabaseService } from '../database/database.service.js';
import { DemoCleanupService } from '../demo-cleanup/demo-cleanup.service.js';
import {
  DEMO_OPPORTUNISTIC_CLEANUP_DELAY_MS,
  DemoCleanupOpportunisticService,
} from '../demo-cleanup/demo-cleanup-opportunistic.service.js';
import { DemoProvisioningService } from '../demo/demo-provisioning.service.js';
import { DemoSeedService } from '../demo/demo-seed.service.js';
import { PRINCIPAL_ENVIRONMENT_ID } from '../environments/principal-environment.js';
import { DemoStatus, Prisma } from '../generated/prisma/client.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password/password.service.js';
import { SessionStoreService } from './session/session-store.service.js';

describe('Login provisioning signal and opportunistic cleanup (portfolio_test)', () => {
  let application: INestApplication;
  let app: Express;
  let database: DatabaseService;
  let auth: AuthService;
  let coordinator: DemoCleanupOpportunisticService;
  const environmentIds: string[] = [];
  const userIds: string[] = [];
  const employeeIds: string[] = [];
  const sessionIds: string[] = [];
  const originIpHash = 'd'.repeat(64);
  const password = 'demo-cleanup-test-password';
  let senhaHash: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    application = module.createNestApplication();
    application.use(application.get(SessionStoreService).middleware);
    application.useGlobalFilters(new HttpExceptionFilter());
    await application.init();
    app = application.getHttpAdapter().getInstance() as Express;
    database = application.get(DatabaseService);
    auth = application.get(AuthService);
    coordinator = application.get(DemoCleanupOpportunisticService);
    senhaHash = await application.get(PasswordService).hash(password);
    expect(new URL(process.env.DATABASE_URL!).pathname).toBe('/portfolio_test');
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // These tests never leave a scheduled timer or unresolved task behind.
    await database.session.deleteMany({ where: { sid: { in: sessionIds } } });
    if (userIds.length) {
      await database.$executeRaw`
        DELETE FROM "session" WHERE "sess" ->> 'usuarioId' IN (${Prisma.join(userIds)})
      `;
    }
    const where = { environmentId: { in: environmentIds } };
    await database.historicoOrdemServico.deleteMany({ where });
    await database.ordemServico.deleteMany({ where });
    await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    await database.cliente.deleteMany({ where });
    await database.funcionario.deleteMany({
      where: { id: { in: employeeIds } },
    });
    await database.contadorOrdemServico.deleteMany({ where });
    await database.environment.deleteMany({
      where: { id: { in: environmentIds }, tipo: 'DEMO' },
    });
    environmentIds.length =
      userIds.length =
      employeeIds.length =
      sessionIds.length =
        0;
  });

  afterAll(async () => {
    await application.close();
  });

  async function fixture(status: DemoStatus | 'PRINCIPAL') {
    const environmentId =
      status === 'PRINCIPAL' ? PRINCIPAL_ENVIRONMENT_ID : randomUUID();
    if (status !== 'PRINCIPAL') {
      environmentIds.push(environmentId);
      await database.$executeRaw`
        INSERT INTO "environment" (
          "id", "tipo", "criado_em", "expires_at", "demo_status",
          "demo_data_mode", "tutorial_enabled", "origin_ip_hash", "provisioned_at"
        ) VALUES (
          ${environmentId}::uuid, 'DEMO', statement_timestamp(),
          statement_timestamp() + INTERVAL '24 hours', ${status}::demo_status,
          'VAZIO', false, ${originIpHash},
          CASE WHEN ${status}::demo_status = 'PRONTA' THEN statement_timestamp() ELSE NULL END
        )
      `;
    }
    const email = `${randomUUID()}@opportunistic.example.test`;
    const employee = await database.funcionario.create({
      data: {
        environmentId,
        nome: 'Admin fixture',
        telefone: '11999999999',
        email,
      },
    });
    employeeIds.push(employee.id);
    const user = await database.usuario.create({
      data: {
        environmentId,
        funcionarioId: employee.id,
        emailLogin: email,
        senhaHash,
        perfil: 'ADMINISTRADOR',
        deveAlterarSenha: false,
      },
    });
    userIds.push(user.id);
    return { user, email, environmentId };
  }

  async function csrfAgent() {
    const agent = request.agent(app);
    const csrf = await agent.get('/auth/csrf').expect(200);
    const signed = decodeURIComponent(
      csrf.headers['set-cookie'][0].split(';')[0].slice('connect.sid='.length),
    );
    sessionIds.push(signed.slice(2).split('.')[0]);
    return { agent, csrfToken: csrf.body.csrfToken as string };
  }

  it.each([
    'PRINCIPAL',
    DemoStatus.PRONTA,
    DemoStatus.PENDENTE,
    DemoStatus.FALHA,
  ] as const)(
    'signals only a transition committed by this %s authentication',
    async (status) => {
      const { user, email, environmentId } = await fixture(status);
      const result = await auth.authenticate(email, password);
      expect(result).toMatchObject({
        usuario: { id: user.id },
        demoProvisionedNow:
          status === DemoStatus.PENDENTE || status === DemoStatus.FALHA,
      });
      if (status !== 'PRINCIPAL') {
        expect(
          (
            await database.environment.findUniqueOrThrow({
              where: { id: environmentId },
            })
          ).demoStatus,
        ).toBe(DemoStatus.PRONTA);
        expect(
          await application
            .get(DemoProvisioningService)
            .ensureReady(environmentId, originIpHash, user.id),
        ).toBe(false);
      }
    },
  );

  it('does not signal when another provisioning call completes the transition first', async () => {
    const { email } = await fixture(DemoStatus.PENDENTE);
    const provisioning = application.get(DemoProvisioningService);
    const ensure = provisioning.ensureReady.bind(provisioning);
    vi.spyOn(provisioning, 'ensureReady').mockImplementationOnce(
      async (...args) => {
        expect(await ensure(...args)).toBe(true);
        return ensure(...args);
      },
    );
    expect(await auth.authenticate(email, password)).toMatchObject({
      demoProvisionedNow: false,
    });
  });

  it.each(['PRINCIPAL', DemoStatus.PRONTA] as const)(
    'does not request cleanup on a successful %s HTTP login',
    async (status) => {
      const { email } = await fixture(status);
      const schedule = vi.spyOn(coordinator, 'requestCleanup');
      const { agent, csrfToken } = await csrfAgent();
      const response = await agent
        .post('/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({ email, password })
        .expect(200);
      expect(response.body).not.toHaveProperty('demoProvisionedNow');
      expect(schedule).not.toHaveBeenCalled();
    },
  );

  it.each([DemoStatus.PENDENTE, DemoStatus.FALHA])(
    'requests cleanup only after successful %s provisioning and HTTP completion',
    async (status) => {
      const { email, user } = await fixture(status);
      const schedule = vi
        .spyOn(coordinator, 'requestCleanup')
        .mockImplementation(() => {});
      const { agent, csrfToken } = await csrfAgent();
      const response = await agent
        .post('/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({ email, password })
        .expect(200);
      expect(schedule).toHaveBeenCalledOnce();
      expect(response.body).toEqual({
        id: user.id,
        perfil: 'ADMINISTRADOR',
        funcionarioId: user.funcionarioId,
        funcionarioNome: 'Admin fixture',
        deveAlterarSenha: false,
      });
      expect(
        await database.session.count({
          where: { sess: { path: ['usuarioId'], equals: user.id } },
        }),
      ).toBe(1);
    },
  );

  it.each(['invalid-password', 'provisioning-failure'])(
    'does not request cleanup after %s in a real HTTP login',
    async (failure) => {
      const { email, environmentId } = await fixture(DemoStatus.PENDENTE);
      const schedule = vi.spyOn(coordinator, 'requestCleanup');
      if (failure === 'provisioning-failure') {
        vi.spyOn(
          application.get(DemoSeedService),
          'provision',
        ).mockRejectedValueOnce(new Error('private seed marker'));
      }
      const { agent, csrfToken } = await csrfAgent();
      await agent
        .post('/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          email,
          password: failure === 'invalid-password' ? 'incorrect' : password,
        })
        .expect(failure === 'invalid-password' ? 401 : 503);
      expect(schedule).not.toHaveBeenCalled();
      expect(
        (
          await database.environment.findUniqueOrThrow({
            where: { id: environmentId },
          })
        ).demoStatus,
      ).toBe(
        failure === 'invalid-password' ? DemoStatus.PENDENTE : DemoStatus.FALHA,
      );
    },
  );

  it('completes real HTTP login and preserves its session after delayed background rejection', async () => {
    const { email, user } = await fixture(DemoStatus.PENDENTE);
    const { agent, csrfToken } = await csrfAgent();
    let reject!: (error: Error) => void;
    const pending = new Promise<never>((_, fail) => {
      reject = fail;
    });
    const cleanup = vi
      .spyOn(application.get(DemoCleanupService), 'cleanupOneBatchIfAvailable')
      .mockReturnValue(pending);
    const errorLog = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const response = await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email, password })
      .expect(200);
    expect(cleanup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DEMO_OPPORTUNISTIC_CLEANUP_DELAY_MS - 1);
    expect(cleanup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(cleanup).toHaveBeenCalledOnce();
    // The HTTP response has already been received while the task is still pending.
    expect(response.body.id).toBe(user.id);
    reject(new Error('private SQL failure marker'));
    await vi.advanceTimersByTimeAsync(0);
    expect(errorLog).toHaveBeenCalledWith('Opportunistic DEMO cleanup failed.');
    vi.useRealTimers();
    await agent
      .get('/auth/session')
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(user.id));
    expect(
      (
        await database.environment.findUniqueOrThrow({
          where: { id: user.environmentId },
        })
      ).demoStatus,
    ).toBe(DemoStatus.PRONTA);
  });
});
