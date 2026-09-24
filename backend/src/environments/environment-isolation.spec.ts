import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../app.module.js';
import { PasswordService } from '../auth/password/password.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { DatabaseService } from '../database/database.service.js';
import {
  DemoDataMode,
  DemoStatus,
  Perfil,
  StatusOrdemServico,
  TipoEnvironment,
  Visibilidade,
} from '../generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run Environment isolation tests.',
  );
}

type EnvironmentFixture = {
  id: string;
  adminEmployeeId: string;
  adminUserId: string;
  email: string;
  password: string;
  expiresAt: Date;
};

type AuthenticatedAgent = {
  agent: SuperAgentTest;
  csrfToken: string;
};

const clientBody = (name: string, document?: string) => ({
  nome: name,
  telefone: '11999999999',
  ...(document ? { documento: document } : {}),
  cep: '01001000',
  logradouro: 'Praça da Sé',
  numero: '1',
  bairro: 'Sé',
  cidade: 'São Paulo',
  uf: 'SP',
});

describe('Environment application isolation', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let passwordService: PasswordService;
  let testingModule: TestingModule;
  let verificationPool: Pool;
  let environmentA: EnvironmentFixture;
  let environmentB: EnvironmentFixture;
  const environmentIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();
    const sessions = nestApplication.get(SessionStoreService);
    nestApplication.use(sessions.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions('http://localhost:5173'));
    await nestApplication.init();

    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    passwordService = nestApplication.get(PasswordService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  beforeEach(async () => {
    environmentA = await createEnvironmentFixture('A');
    environmentB = await createEnvironmentFixture('B');
  });

  afterEach(async () => {
    if (!environmentIds.length) return;

    const users = await database.usuario.findMany({
      where: { environmentId: { in: environmentIds } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);

    if (userIds.length) {
      await verificationPool.query(
        `DELETE FROM "session"
         WHERE "sess" ->> 'usuarioId' = ANY($1::text[])`,
        [userIds],
      );
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
    environmentIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool.end();
    await nestApplication.close();
  });

  async function createEnvironmentFixture(
    label: string,
    expiresInMs = 86_400_000,
  ): Promise<EnvironmentFixture> {
    const id = crypto.randomUUID();
    const suffix = crypto.randomUUID();
    const normalizedLabel = label.toLowerCase();
    const password = `senha-${label}-segura`;
    const expiresAt = new Date(Date.now() + expiresInMs);
    const criadoEm = new Date(expiresAt.getTime() - 86_400_000);
    const environment = await database.environment.create({
      data: {
        id,
        tipo: TipoEnvironment.DEMO,
        criadoEm,
        expiresAt,
        demoStatus: DemoStatus.PENDENTE,
        demoDataMode: DemoDataMode.EXEMPLO,
        tutorialEnabled: true,
        originIpHash: 'a'.repeat(64),
        contadorOrdemServico: { create: { ultimoNumero: 0 } },
      },
    });
    const employee = await database.funcionario.create({
      data: {
        environmentId: environment.id,
        nome: `Administrador ${label}`,
        telefone: '11999999999',
        email: `admin-${normalizedLabel}-${suffix}@example.test`,
      },
    });
    const email = `login-${normalizedLabel}-${suffix}@example.test`;
    const user = await database.usuario.create({
      data: {
        environmentId: environment.id,
        emailLogin: email,
        senhaHash: await passwordService.hash(password),
        perfil: Perfil.ADMINISTRADOR,
        ativo: true,
        deveAlterarSenha: false,
        funcionarioId: employee.id,
      },
    });

    environmentIds.push(environment.id);

    return {
      id: environment.id,
      adminEmployeeId: employee.id,
      adminUserId: user.id,
      email,
      password,
      expiresAt,
    };
  }

  async function authenticate(
    environment: EnvironmentFixture,
  ): Promise<AuthenticatedAgent> {
    const agent = request.agent(app);
    const anonymousCsrf = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    await agent
      .post('/auth/login')
      .set('X-CSRF-Token', anonymousCsrf.body.csrfToken as string)
      .send({ email: environment.email, password: environment.password })
      .expect(HttpStatus.OK);
    const authenticatedCsrf = await agent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);

    return {
      agent,
      csrfToken: authenticatedCsrf.body.csrfToken as string,
    };
  }

  async function createEmployee(
    environmentId: string,
    options: { account?: boolean; profile?: Perfil; name?: string } = {},
  ) {
    const suffix = crypto.randomUUID();
    const employee = await database.funcionario.create({
      data: {
        environmentId,
        nome: options.name ?? `Funcionário ${suffix}`,
        telefone: '11988887777',
        email: `employee-${suffix}@example.test`,
      },
    });

    if (options.account === false) return { employee, user: null };

    const user = await database.usuario.create({
      data: {
        environmentId,
        emailLogin: `employee-login-${suffix}@example.test`,
        senhaHash: await passwordService.hash('senha-funcionario-segura'),
        perfil: options.profile ?? Perfil.FUNCIONARIO,
        ativo: true,
        deveAlterarSenha: false,
        funcionarioId: employee.id,
      },
    });

    return { employee, user };
  }

  async function createClient(environmentId: string, name: string) {
    return database.cliente.create({
      data: {
        environmentId,
        ...clientBody(name),
      },
    });
  }

  async function createOrder(
    environmentId: string,
    clienteId: string,
    responsavelId: string,
    options: {
      number?: string;
      status?: StatusOrdemServico;
      visibility?: Visibilidade;
      value?: string;
      completedAt?: Date;
    } = {},
  ) {
    return database.ordemServico.create({
      data: {
        environmentId,
        numero: options.number ?? `OS-${crypto.randomUUID()}`,
        descricao: 'Ordem de isolamento.',
        valor: options.value ?? '100.00',
        status: options.status ?? StatusOrdemServico.AGUARDANDO,
        visibilidade: options.visibility ?? Visibilidade.PRIVADA,
        concluidoEm:
          options.status === StatusOrdemServico.CONCLUIDO
            ? (options.completedAt ?? new Date())
            : null,
        clienteId,
        responsavelId,
      },
    });
  }

  it('discovers Environment globally at login but persists only usuarioId in the session', async () => {
    const expiringEnvironment = await createEnvironmentFixture(
      'expiring',
      3_000,
    );
    const [agentA, expiringAgent] = await Promise.all([
      authenticate(environmentA),
      authenticate(expiringEnvironment),
    ]);
    const [sessionA, expiringSession] = await Promise.all([
      agentA.agent.get('/auth/session').expect(HttpStatus.OK),
      expiringAgent.agent.get('/auth/session').expect(HttpStatus.OK),
    ]);
    const persistedSessions = await verificationPool.query<{
      sess: Record<string, unknown>;
    }>(
      `SELECT "sess"
       FROM "session"
       WHERE "sess" ->> 'usuarioId' = ANY($1::text[])
       ORDER BY "sess" ->> 'usuarioId'`,
      [[environmentA.adminUserId, expiringEnvironment.adminUserId]],
    );

    expect(sessionA.body.id).toBe(environmentA.adminUserId);
    expect(expiringSession.body.id).toBe(expiringEnvironment.adminUserId);
    expect(sessionA.body).not.toHaveProperty('environmentId');
    expect(expiringSession.body).not.toHaveProperty('environmentId');
    expect(persistedSessions.rows).toHaveLength(2);
    for (const { sess } of persistedSessions.rows) {
      expect(Object.keys(sess).sort()).toEqual([
        'cookie',
        'csrfToken',
        'usuarioId',
      ]);
      expect(sess).not.toHaveProperty('environmentId');
    }

    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.max(0, expiringEnvironment.expiresAt.getTime() - Date.now() + 50),
      ),
    );
    await expiringAgent.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_UNAUTHENTICATED');
      });
    await agentA.agent.get('/auth/session').expect(HttpStatus.OK);
  });

  it('isolates every Client operation and scopes document uniqueness', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const document = '52998224725';
    const createdA = await agentA.agent
      .post('/clients')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(clientBody('Cliente A', document))
      .expect(HttpStatus.CREATED);
    const createdB = await agentB.agent
      .post('/clients')
      .set('X-CSRF-Token', agentB.csrfToken)
      .send(clientBody('Cliente B', document))
      .expect(HttpStatus.CREATED);

    await agentA.agent
      .post('/clients')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(clientBody('Cliente A duplicado', document))
      .expect(HttpStatus.CONFLICT);

    const listA = await agentA.agent
      .get('/clients?status=all')
      .expect(HttpStatus.OK);
    expect(listA.body.map((client: { id: string }) => client.id)).toContain(
      createdA.body.id,
    );
    expect(listA.body.map((client: { id: string }) => client.id)).not.toContain(
      createdB.body.id,
    );

    await agentA.agent
      .get(`/clients/${createdB.body.id}`)
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .put(`/clients/${createdB.body.id}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(clientBody('Tentativa externa', document))
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .patch(`/clients/${createdB.body.id}/status`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({ status: 'inactive' })
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .delete(`/clients/${createdB.body.id}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('blocks every administrative Employee and account operation across Environments', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const targetWithoutAccount = await createEmployee(environmentB.id, {
      account: false,
      name: 'Funcionário B sem conta',
    });
    const listA = await agentA.agent
      .get('/employees?status=all')
      .expect(HttpStatus.OK);

    expect(
      listA.body.map((employee: { id: string }) => employee.id),
    ).not.toContain(environmentB.adminEmployeeId);
    await agentA.agent
      .get(`/employees/${environmentB.adminEmployeeId}`)
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .put(`/employees/${environmentB.adminEmployeeId}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        nome: 'Ataque',
        telefone: '11911112222',
        email: 'attack@example.test',
      })
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .patch(`/employees/${environmentB.adminEmployeeId}/status`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({ status: 'inactive' })
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .post(`/employees/${targetWithoutAccount.employee.id}/account`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        loginEmail: `attack-${crypto.randomUUID()}@example.test`,
        profile: 'employee',
        initialPassword: 'senha-temporaria',
        confirmPassword: 'senha-temporaria',
      })
      .expect(HttpStatus.NOT_FOUND);

    const accountOperations = [
      agentA.agent
        .patch(`/employees/${environmentB.adminEmployeeId}/account/status`)
        .set('X-CSRF-Token', agentA.csrfToken)
        .send({ status: 'inactive' }),
      agentA.agent
        .patch(`/employees/${environmentB.adminEmployeeId}/account/profile`)
        .set('X-CSRF-Token', agentA.csrfToken)
        .send({ profile: 'employee' }),
      agentA.agent
        .patch(`/employees/${environmentB.adminEmployeeId}/account/login-email`)
        .set('X-CSRF-Token', agentA.csrfToken)
        .send({ loginEmail: `changed-${crypto.randomUUID()}@example.test` }),
      agentA.agent
        .patch(`/employees/${environmentB.adminEmployeeId}/account/password`)
        .set('X-CSRF-Token', agentA.csrfToken)
        .send({
          temporaryPassword: 'nova-senha-segura',
          confirmPassword: 'nova-senha-segura',
        }),
    ];
    const responses = await Promise.all(accountOperations);
    for (const response of responses)
      expect(response.status).toBe(HttpStatus.NOT_FOUND);

    await agentA.agent
      .put(`/employees/${environmentB.adminEmployeeId}/administrative`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        nome: 'Ataque administrativo',
        telefone: '11911112222',
        email: 'attack-admin@example.test',
        status: 'active',
        account: {
          loginEmail: `attack-admin-${crypto.randomUUID()}@example.test`,
          profile: 'employee',
          status: 'active',
        },
      })
      .expect(HttpStatus.NOT_FOUND);

    await agentB.agent.get('/auth/session').expect(HttpStatus.OK);
  });

  it('calculates the last active Administrator only inside the authenticated Environment', async () => {
    const agentA = await authenticate(environmentA);
    await Promise.all([
      createEmployee(environmentB.id, { profile: Perfil.ADMINISTRADOR }),
      createEmployee(environmentB.id, { profile: Perfil.ADMINISTRADOR }),
      createEmployee(environmentB.id, { profile: Perfil.ADMINISTRADOR }),
    ]);

    await agentA.agent
      .patch(`/employees/${environmentA.adminEmployeeId}/account/profile`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({ profile: 'employee' })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => {
        expect(body.code).toBe('LAST_ACTIVE_ADMIN_REQUIRED');
      });
  });

  it('isolates Orders, History, relations and the per-Environment counter', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const [clientA, clientB] = await Promise.all([
      createClient(environmentA.id, 'Cliente A'),
      createClient(environmentB.id, 'Cliente B'),
    ]);
    const createBody = (clienteId: string, responsavelId: string) => ({
      clienteId,
      responsavelId,
      descricao: 'Ordem criada pela API.',
      valor: '100.00',
      visibilidade: Visibilidade.PUBLICA,
    });
    const orderA = await agentA.agent
      .post('/orders')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(createBody(clientA.id, environmentA.adminEmployeeId))
      .expect(HttpStatus.CREATED);
    const orderB = await agentB.agent
      .post('/orders')
      .set('X-CSRF-Token', agentB.csrfToken)
      .send(createBody(clientB.id, environmentB.adminEmployeeId))
      .expect(HttpStatus.CREATED);

    expect(orderA.body.numero).toBe('OS-000001');
    expect(orderB.body.numero).toBe('OS-000001');

    const listA = await agentA.agent.get('/orders').expect(HttpStatus.OK);
    expect(listA.body.map((order: { id: string }) => order.id)).toContain(
      orderA.body.id,
    );
    expect(listA.body.map((order: { id: string }) => order.id)).not.toContain(
      orderB.body.id,
    );
    await agentA.agent
      .get(`/orders/${orderB.body.id}`)
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .get(`/orders/${orderB.body.id}/history`)
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .put(`/orders/${orderB.body.id}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        versao: 1,
        descricao: 'Tentativa externa.',
        valor: '100.00',
        status: StatusOrdemServico.EM_ANDAMENTO,
        visibilidade: Visibilidade.PUBLICA,
      })
      .expect(HttpStatus.NOT_FOUND);

    await agentA.agent
      .post('/orders')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(createBody(clientB.id, environmentA.adminEmployeeId))
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .post('/orders')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(createBody(clientA.id, environmentB.adminEmployeeId))
      .expect(HttpStatus.NOT_FOUND);
    await agentA.agent
      .put(`/orders/${orderA.body.id}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        versao: 1,
        descricao: 'Tentativa de transferência externa.',
        valor: '100.00',
        status: StatusOrdemServico.AGUARDANDO,
        visibilidade: Visibilidade.PUBLICA,
        responsavelId: environmentB.adminEmployeeId,
      })
      .expect(HttpStatus.NOT_FOUND);

    const [counterA, counterB] = await Promise.all([
      database.contadorOrdemServico.findUniqueOrThrow({
        where: { environmentId: environmentA.id },
      }),
      database.contadorOrdemServico.findUniqueOrThrow({
        where: { environmentId: environmentB.id },
      }),
    ]);
    expect(counterA.ultimoNumero).toBe(1);
    expect(counterB.ultimoNumero).toBe(1);

    const secondOrderA = await agentA.agent
      .post('/orders')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send(createBody(clientA.id, environmentA.adminEmployeeId))
      .expect(HttpStatus.CREATED);
    expect(secondOrderA.body.numero).toBe('OS-000002');
    await expect(
      database.contadorOrdemServico.findUniqueOrThrow({
        where: { environmentId: environmentB.id },
      }),
    ).resolves.toMatchObject({ ultimoNumero: 1 });
  });

  it('keeps Dashboard metrics and Profile mutations inside the authenticated Environment', async () => {
    const agentA = await authenticate(environmentA);
    const baselineSituation = await agentA.agent
      .get('/dashboard/situation')
      .expect(HttpStatus.OK);
    const baselinePerformance = await agentA.agent
      .get('/dashboard/performance')
      .expect(HttpStatus.OK);
    const clientB = await createClient(environmentB.id, 'Cliente métrica B');
    await createOrder(
      environmentB.id,
      clientB.id,
      environmentB.adminEmployeeId,
      { status: StatusOrdemServico.CONCLUIDO },
    );
    await createEmployee(environmentB.id, { account: false });

    const [isolatedSituation, isolatedPerformance] = await Promise.all([
      agentA.agent.get('/dashboard/situation').expect(HttpStatus.OK),
      agentA.agent.get('/dashboard/performance').expect(HttpStatus.OK),
    ]);
    expect(isolatedSituation.body).toEqual(baselineSituation.body);
    expect(isolatedPerformance.body).toEqual(baselinePerformance.body);
    await agentA.agent
      .get(`/dashboard/situation?employeeId=${environmentB.adminEmployeeId}`)
      .expect(HttpStatus.NOT_FOUND);

    const profileBefore = await agentA.agent
      .get('/profile')
      .expect(HttpStatus.OK);
    await agentA.agent
      .put('/profile')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({ nome: 'Administrador A atualizado', telefone: '11977776666' })
      .expect(HttpStatus.OK);
    await agentA.agent
      .put('/profile')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        nome: 'Ataque de perfil',
        telefone: '11977776666',
        funcionarioId: environmentB.adminEmployeeId,
      })
      .expect(HttpStatus.BAD_REQUEST);

    await expect(
      database.funcionario.findUniqueOrThrow({
        where: {
          environmentId_id: {
            environmentId: environmentB.id,
            id: environmentB.adminEmployeeId,
          },
        },
      }),
    ).resolves.toMatchObject({ nome: 'Administrador B' });
    expect(profileBefore.body.nome).toBe('Administrador A');
  });

  it('keeps the raw SQL recurrence metric isolated between Environments', async () => {
    const agentA = await authenticate(environmentA);
    const [clientA, clientB] = await Promise.all([
      createClient(environmentA.id, 'Cliente recorrente A'),
      createClient(environmentB.id, 'Cliente recorrente B'),
    ]);
    const firstCompletion = new Date('2026-01-10T12:00:00.000Z');
    const secondCompletion = new Date('2026-01-11T12:00:00.000Z');

    await createOrder(
      environmentA.id,
      clientA.id,
      environmentA.adminEmployeeId,
      {
        status: StatusOrdemServico.CONCLUIDO,
        completedAt: firstCompletion,
      },
    );
    await createOrder(
      environmentA.id,
      clientA.id,
      environmentA.adminEmployeeId,
      {
        status: StatusOrdemServico.CONCLUIDO,
        completedAt: secondCompletion,
      },
    );

    const beforeEnvironmentB = await agentA.agent
      .get(`/dashboard/performance?employeeId=${environmentA.adminEmployeeId}`)
      .expect(HttpStatus.OK);

    expect(beforeEnvironmentB.body).toMatchObject({
      scope: 'employee',
      employeeId: environmentA.adminEmployeeId,
      performance: {
        completedOrders: 2,
        distinctClientsServed: 1,
        recurringDistinctClients: 1,
      },
    });

    await createOrder(
      environmentB.id,
      clientB.id,
      environmentB.adminEmployeeId,
      {
        status: StatusOrdemServico.CONCLUIDO,
        completedAt: firstCompletion,
      },
    );
    await createOrder(
      environmentB.id,
      clientB.id,
      environmentB.adminEmployeeId,
      {
        status: StatusOrdemServico.CONCLUIDO,
        completedAt: secondCompletion,
      },
    );

    const afterEnvironmentB = await agentA.agent
      .get(`/dashboard/performance?employeeId=${environmentA.adminEmployeeId}`)
      .expect(HttpStatus.OK);

    expect(afterEnvironmentB.body).toEqual(beforeEnvironmentB.body);
    expect(afterEnvironmentB.body.performance).toMatchObject({
      distinctClientsServed: 1,
      recurringDistinctClients: 1,
    });
  });

  it('rejects an Environment B employee in Dashboard performance and excludes B metrics from A', async () => {
    const agentA = await authenticate(environmentA);
    const [employeeA, employeeB, clientA, clientB] = await Promise.all([
      createEmployee(environmentA.id, {
        account: false,
        name: 'Funcionário de performance A',
      }),
      createEmployee(environmentB.id, {
        account: false,
        name: 'Funcionário de performance B',
      }),
      createClient(environmentA.id, 'Cliente de performance A'),
      createClient(environmentB.id, 'Cliente de performance B'),
    ]);

    await createOrder(environmentA.id, clientA.id, employeeA.employee.id, {
      status: StatusOrdemServico.CONCLUIDO,
      value: '125.00',
    });
    const baseline = await agentA.agent
      .get(`/dashboard/performance?employeeId=${employeeA.employee.id}`)
      .expect(HttpStatus.OK);

    await Promise.all([
      createOrder(environmentB.id, clientB.id, employeeB.employee.id, {
        status: StatusOrdemServico.CONCLUIDO,
        value: '800.00',
      }),
      createOrder(environmentB.id, clientB.id, employeeB.employee.id, {
        status: StatusOrdemServico.CANCELADO,
        value: '900.00',
      }),
    ]);

    const isolated = await agentA.agent
      .get(`/dashboard/performance?employeeId=${employeeA.employee.id}`)
      .expect(HttpStatus.OK);
    expect(isolated.body).toEqual(baseline.body);
    expect(isolated.body.performance).toMatchObject({
      completedOrdersValue: '125.00',
      completedOrders: 1,
      cancelledOrders: 0,
      averageCompletedOrderValue: '125.00',
      distinctClientsServed: 1,
      recurringDistinctClients: 0,
    });

    await agentA.agent
      .get(`/dashboard/performance?employeeId=${employeeB.employee.id}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('creates and isolates real Order history snapshots across Environments', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const clientA = await createClient(environmentA.id, 'Cliente histórico A');
    const created = await agentA.agent
      .post('/orders')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        clienteId: clientA.id,
        responsavelId: environmentA.adminEmployeeId,
        descricao: 'Ordem original de A.',
        valor: '100.00',
        visibilidade: Visibilidade.PUBLICA,
      })
      .expect(HttpStatus.CREATED);

    await agentA.agent
      .put(`/orders/${created.body.id}`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        versao: created.body.versao,
        descricao: 'Ordem atualizada em A.',
        valor: '150.00',
        status: StatusOrdemServico.EM_ANDAMENTO,
        visibilidade: Visibilidade.PUBLICA,
      })
      .expect(HttpStatus.OK);

    const history = await agentA.agent
      .get(`/orders/${created.body.id}/history`)
      .expect(HttpStatus.OK);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({
      versao: 1,
      descricao: 'Ordem original de A.',
      valor: '100.00',
      status: StatusOrdemServico.AGUARDANDO,
      visibilidade: Visibilidade.PUBLICA,
      responsavel: {
        id: environmentA.adminEmployeeId,
        nome: 'Administrador A',
      },
      alteradoPor: {
        id: environmentA.adminUserId,
        nome: 'Administrador A',
      },
    });
    await expect(
      database.historicoOrdemServico.count({
        where: {
          environmentId: environmentA.id,
          ordemServicoId: created.body.id as string,
        },
      }),
    ).resolves.toBe(1);

    await agentB.agent
      .get(`/orders/${created.body.id}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('ORDER_NOT_FOUND'));
    await agentB.agent
      .get(`/orders/${created.body.id}/history`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('ORDER_NOT_FOUND'));
  });

  it('changes only the authenticated account password and revokes only its sessions', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const [accountABefore, accountBBefore] = await Promise.all([
      database.usuario.findUniqueOrThrow({
        where: { id: environmentA.adminUserId },
      }),
      database.usuario.findUniqueOrThrow({
        where: { id: environmentB.adminUserId },
      }),
    ]);
    const newPassword = 'senha-A-nova-segura';

    await agentA.agent
      .put('/profile/password')
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        currentPassword: environmentA.password,
        newPassword,
        newPasswordConfirmation: newPassword,
      })
      .expect(HttpStatus.NO_CONTENT)
      .expect('');

    const [accountAAfter, accountBAfter] = await Promise.all([
      database.usuario.findUniqueOrThrow({
        where: { id: environmentA.adminUserId },
      }),
      database.usuario.findUniqueOrThrow({
        where: { id: environmentB.adminUserId },
      }),
    ]);

    expect(accountAAfter.senhaHash).not.toBe(accountABefore.senhaHash);
    await expect(
      passwordService.verify(accountAAfter.senhaHash, newPassword),
    ).resolves.toBe(true);
    await expect(
      passwordService.verify(accountAAfter.senhaHash, environmentA.password),
    ).resolves.toBe(false);
    expect(accountBAfter).toEqual(accountBBefore);
    await expect(
      passwordService.verify(accountBAfter.senhaHash, environmentB.password),
    ).resolves.toBe(true);
    await agentA.agent.get('/auth/session').expect(HttpStatus.UNAUTHORIZED);
    await agentB.agent.get('/auth/session').expect(HttpStatus.OK);
  });

  it('keeps explicit Client and Employee filters inside Environment A', async () => {
    const agentA = await authenticate(environmentA);
    const clientToken = `cliente-b-${crypto.randomUUID()}`;
    const employeeToken = `funcionario-b-${crypto.randomUUID()}`;
    const [clientA, clientB, employeeA, employeeB] = await Promise.all([
      createClient(environmentA.id, 'Cliente inativo A'),
      createClient(environmentB.id, clientToken),
      createEmployee(environmentA.id, {
        account: false,
        name: 'Funcionário inativo A',
      }),
      createEmployee(environmentB.id, {
        account: false,
        name: employeeToken,
      }),
    ]);
    await Promise.all([
      database.cliente.update({
        where: { id: clientA.id },
        data: { ativo: false },
      }),
      database.cliente.update({
        where: { id: clientB.id },
        data: { ativo: false },
      }),
      database.funcionario.update({
        where: { id: employeeA.employee.id },
        data: { ativo: false },
      }),
      database.funcionario.update({
        where: { id: employeeB.employee.id },
        data: { ativo: false },
      }),
    ]);

    const [clientSearch, inactiveClients, employeeSearch, inactiveEmployees] =
      await Promise.all([
        agentA.agent
          .get('/clients')
          .query({ status: 'inactive', search: clientToken })
          .expect(HttpStatus.OK),
        agentA.agent
          .get('/clients')
          .query({ status: 'inactive' })
          .expect(HttpStatus.OK),
        agentA.agent
          .get('/employees')
          .query({ status: 'inactive', search: employeeToken })
          .expect(HttpStatus.OK),
        agentA.agent
          .get('/employees')
          .query({ status: 'inactive' })
          .expect(HttpStatus.OK),
      ]);

    expect(clientSearch.body).toEqual([]);
    expect(
      inactiveClients.body.map((client: { id: string }) => client.id),
    ).toContain(clientA.id);
    expect(
      inactiveClients.body.map((client: { id: string }) => client.id),
    ).not.toContain(clientB.id);
    expect(employeeSearch.body).toEqual([]);
    expect(
      inactiveEmployees.body.map((employee: { id: string }) => employee.id),
    ).toContain(employeeA.employee.id);
    expect(
      inactiveEmployees.body.map((employee: { id: string }) => employee.id),
    ).not.toContain(employeeB.employee.id);
  });

  it('keeps emailLogin globally unique without exposing or changing Environment B', async () => {
    const [agentA, agentB] = await Promise.all([
      authenticate(environmentA),
      authenticate(environmentB),
    ]);
    const [employeeWithoutAccount, employeeWithAccount] = await Promise.all([
      createEmployee(environmentA.id, {
        account: false,
        name: 'Funcionário A sem conta',
      }),
      createEmployee(environmentA.id, {
        name: 'Funcionário A com conta',
      }),
    ]);
    const [accountABefore, accountBBefore] = await Promise.all([
      database.usuario.findUniqueOrThrow({
        where: { id: employeeWithAccount.user!.id },
      }),
      database.usuario.findUniqueOrThrow({
        where: { id: environmentB.adminUserId },
      }),
    ]);
    const uniquenessConflict = {
      statusCode: HttpStatus.CONFLICT,
      code: 'LOGIN_EMAIL_ALREADY_EXISTS',
      message: 'Login email already exists',
    };

    await agentA.agent
      .post(`/employees/${employeeWithoutAccount.employee.id}/account`)
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({
        loginEmail: environmentB.email,
        profile: 'employee',
        initialPassword: 'senha-temporaria-segura',
        confirmPassword: 'senha-temporaria-segura',
      })
      .expect(HttpStatus.CONFLICT)
      .expect(uniquenessConflict);
    await agentA.agent
      .patch(
        `/employees/${employeeWithAccount.employee.id}/account/login-email`,
      )
      .set('X-CSRF-Token', agentA.csrfToken)
      .send({ loginEmail: environmentB.email })
      .expect(HttpStatus.CONFLICT)
      .expect(uniquenessConflict);

    await expect(
      database.usuario.findUnique({
        where: {
          environmentId_funcionarioId: {
            environmentId: environmentA.id,
            funcionarioId: employeeWithoutAccount.employee.id,
          },
        },
      }),
    ).resolves.toBeNull();
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employeeWithAccount.user!.id },
      }),
    ).resolves.toEqual(accountABefore);
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: environmentB.adminUserId },
      }),
    ).resolves.toEqual(accountBBefore);
    await agentB.agent.get('/auth/session').expect(HttpStatus.OK);
  });
});
