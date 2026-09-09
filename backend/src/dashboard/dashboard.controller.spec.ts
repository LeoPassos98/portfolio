import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { setupOpenApi } from '../common/openapi/openapi.setup.js';
import { DatabaseService } from '../database/database.service.js';
import {
  StatusOrdemServico,
  Visibilidade,
} from '../generated/prisma/client.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run dashboard tests.');
}

type EmployeeFixture = { id: string; userId?: string };

function getSessionId(cookie: string | undefined): string {
  if (!cookie) throw new Error('Expected a session cookie.');
  const signed = decodeURIComponent(
    cookie.split(';', 1)[0]!.replace('connect.sid=', ''),
  );
  const id = signed.slice(2).split('.', 1)[0];
  if (!signed.startsWith('s:') || !id) throw new Error('Expected session id.');
  return id;
}

describe('DashboardController', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let testingModule: TestingModule;
  let verificationPool: Pool;
  const clientIds: string[] = [];
  const employeeIds: string[] = [];
  const historyIds: string[] = [];
  const orderIds: string[] = [];
  const sessionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();
    const sessions = nestApplication.get(SessionStoreService);
    nestApplication.use(sessions.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions('http://localhost:5173'));
    setupOpenApi(nestApplication);
    await nestApplication.init();
    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    if (sessionIds.length) {
      await verificationPool.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    }
    if (orderIds.length) {
      if (historyIds.length) {
        await database.historicoOrdemServico.deleteMany({
          where: { id: { in: historyIds } },
        });
      }
      await database.ordemServico.deleteMany({
        where: { id: { in: orderIds } },
      });
    }
    if (clientIds.length) {
      await database.cliente.deleteMany({
        where: { id: { in: clientIds } },
      });
    }
    if (userIds.length) {
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    }
    if (employeeIds.length) {
      await database.funcionario.deleteMany({
        where: { id: { in: employeeIds } },
      });
    }
    clientIds.length = 0;
    employeeIds.length = 0;
    historyIds.length = 0;
    orderIds.length = 0;
    sessionIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool.end();
    await nestApplication.close();
  });

  async function createEmployeeFixture(
    options: {
      ativo?: boolean;
      perfil?: 'ADMINISTRADOR' | 'FUNCIONARIO';
      createUser?: boolean;
      criadoEm?: Date;
      deveAlterarSenha?: boolean;
    } = {},
  ): Promise<EmployeeFixture> {
    const suffix = crypto.randomUUID();
    const employee = await database.funcionario.create({
      data: {
        nome: `Funcionário ${suffix}`,
        telefone: '11999999999',
        email: `funcionario-${suffix}@example.test`,
        ativo: options.ativo ?? true,
        criadoEm: options.criadoEm,
      },
    });
    employeeIds.push(employee.id);

    if (options.createUser === false) return { id: employee.id };

    const user = await database.usuario.create({
      data: {
        emailLogin: `login-${suffix}@example.test`,
        senhaHash: 'test-only-hash',
        perfil: options.perfil ?? 'FUNCIONARIO',
        ativo: true,
        deveAlterarSenha: options.deveAlterarSenha ?? false,
        funcionarioId: employee.id,
      },
    });
    userIds.push(user.id);
    return { id: employee.id, userId: user.id };
  }

  async function createAgent(
    options: Parameters<typeof createEmployeeFixture>[0],
  ) {
    const employee = await createEmployeeFixture(options);
    if (!employee.userId) throw new Error('Expected an access account.');
    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sid = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.push(sid);
    await verificationPool.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sid, employee.userId],
    );
    return { agent, employee };
  }

  async function createOrderFixture(
    responsavelId: string,
    status: StatusOrdemServico,
    visibilidade: Visibilidade = Visibilidade.PRIVADA,
  ): Promise<void> {
    const suffix = crypto.randomUUID();
    const client = await database.cliente.create({
      data: {
        nome: `Cliente ${suffix}`,
        telefone: '11988887777',
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    });
    const order = await database.ordemServico.create({
      data: {
        numero: `OS-${suffix}`,
        descricao: 'Descrição da ordem.',
        valor: '100.00',
        status,
        visibilidade,
        clienteId: client.id,
        responsavelId,
      },
    });
    clientIds.push(client.id);
    orderIds.push(order.id);
  }

  async function createPerformanceClientFixture(
    options: { ativo?: boolean; criadoEm?: Date } = {},
  ) {
    const suffix = crypto.randomUUID();
    const client = await database.cliente.create({
      data: {
        nome: `Cliente de desempenho ${suffix}`,
        telefone: '11988887777',
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
        ativo: options.ativo ?? true,
        criadoEm: options.criadoEm,
      },
    });
    clientIds.push(client.id);
    return client;
  }

  async function createPerformanceOrderFixture(options: {
    responsavelId: string;
    status: StatusOrdemServico;
    valor?: string;
    clienteId?: string;
    concluidoEm?: Date | null;
    canceladoEm?: Date | null;
    visibilidade?: Visibilidade;
  }) {
    const client = options.clienteId
      ? undefined
      : await createPerformanceClientFixture();
    const order = await database.ordemServico.create({
      data: {
        numero: `OS-${crypto.randomUUID()}`,
        descricao: 'Ordem usada nas métricas temporais.',
        valor: options.valor ?? '100.00',
        status: options.status,
        visibilidade: options.visibilidade ?? Visibilidade.PRIVADA,
        concluidoEm: options.concluidoEm,
        canceladoEm: options.canceladoEm,
        clienteId: options.clienteId ?? client!.id,
        responsavelId: options.responsavelId,
      },
    });
    orderIds.push(order.id);
    return order;
  }

  it('returns zero-valued global indicators when there is no relevant data', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });

    await administrator.agent
      .get('/dashboard/situation')
      .expect(200)
      .expect({
        scope: 'administrator',
        clients: { active: 0, total: 0 },
        employees: { active: 1, total: 1 },
        orders: { awaiting: 0, inProgress: 0, total: 0 },
      });
  });

  it('counts global current data across statuses, visibility, and responsible employees', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const activeEmployee = await createEmployeeFixture();
    const inactiveEmployee = await createEmployeeFixture({
      ativo: false,
      createUser: false,
    });
    const activeClient = await database.cliente.create({
      data: {
        nome: 'Cliente ativo',
        telefone: '11999999999',
        cep: '01001000',
        logradouro: 'Praça',
        numero: '1',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
        ativo: true,
      },
    });
    const inactiveClient = await database.cliente.create({
      data: {
        nome: 'Cliente inativo',
        telefone: '11999999998',
        cep: '01001000',
        logradouro: 'Praça',
        numero: '2',
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
        ativo: false,
      },
    });
    clientIds.push(activeClient.id, inactiveClient.id);
    await createOrderFixture(activeEmployee.id, StatusOrdemServico.AGUARDANDO);
    await createOrderFixture(
      activeEmployee.id,
      StatusOrdemServico.EM_ANDAMENTO,
      Visibilidade.PUBLICA,
    );
    await createOrderFixture(inactiveEmployee.id, StatusOrdemServico.CONCLUIDO);
    await createOrderFixture(
      inactiveEmployee.id,
      StatusOrdemServico.CANCELADO,
      Visibilidade.PUBLICA,
    );

    await administrator.agent
      .get('/dashboard/situation')
      .expect(200)
      .expect({
        scope: 'administrator',
        clients: { active: 5, total: 6 },
        employees: { active: 2, total: 3 },
        orders: { awaiting: 1, inProgress: 1, total: 4 },
      });
  });

  it('measures an employee only by current responsibility, not public visibility', async () => {
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });
    const otherEmployee = await createEmployeeFixture();
    await createOrderFixture(
      employee.employee.id,
      StatusOrdemServico.AGUARDANDO,
    );
    await createOrderFixture(
      employee.employee.id,
      StatusOrdemServico.EM_ANDAMENTO,
    );
    await createOrderFixture(
      employee.employee.id,
      StatusOrdemServico.CONCLUIDO,
    );
    await createOrderFixture(
      employee.employee.id,
      StatusOrdemServico.CANCELADO,
    );
    await createOrderFixture(
      otherEmployee.id,
      StatusOrdemServico.AGUARDANDO,
      Visibilidade.PUBLICA,
    );
    await createOrderFixture(otherEmployee.id, StatusOrdemServico.EM_ANDAMENTO);

    await employee.agent
      .get('/dashboard/situation')
      .expect(200)
      .expect({
        scope: 'employee',
        employeeId: employee.employee.id,
        orders: { awaiting: 1, inProgress: 1, total: 4 },
      });
  });

  it('allows an employee to request their own explicit context', async () => {
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });

    await employee.agent
      .get(`/dashboard/situation?employeeId=${employee.employee.id}`)
      .expect(200)
      .expect({
        scope: 'employee',
        employeeId: employee.employee.id,
        orders: { awaiting: 0, inProgress: 0, total: 0 },
      });
  });

  it('forbids an employee from requesting another employee context', async () => {
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });
    const otherEmployee = await createEmployeeFixture();

    await employee.agent
      .get(`/dashboard/situation?employeeId=${otherEmployee.id}`)
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'DASHBOARD_SCOPE_FORBIDDEN',
        message: 'Employee cannot view another employee dashboard situation',
      });
  });

  it('returns the selected active employee situation to an administrator', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createEmployeeFixture();
    await createOrderFixture(employee.id, StatusOrdemServico.AGUARDANDO);
    await createOrderFixture(employee.id, StatusOrdemServico.CONCLUIDO);

    await administrator.agent
      .get(`/dashboard/situation?employeeId=${employee.id}`)
      .expect(200)
      .expect({
        scope: 'employee',
        employeeId: employee.id,
        orders: { awaiting: 1, inProgress: 0, total: 2 },
      });
  });

  it('keeps the historical context of an inactive employee for an administrator', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const inactiveEmployee = await createEmployeeFixture({
      ativo: false,
      createUser: false,
    });
    await createOrderFixture(
      inactiveEmployee.id,
      StatusOrdemServico.EM_ANDAMENTO,
    );

    await administrator.agent
      .get(`/dashboard/situation?employeeId=${inactiveEmployee.id}`)
      .expect(200)
      .expect({
        scope: 'employee',
        employeeId: inactiveEmployee.id,
        orders: { awaiting: 0, inProgress: 1, total: 1 },
      });
  });

  it('returns zero order indicators for an administrator-selected employee without orders', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createEmployeeFixture({ createUser: false });

    await administrator.agent
      .get(`/dashboard/situation?employeeId=${employee.id}`)
      .expect(200)
      .expect({
        scope: 'employee',
        employeeId: employee.id,
        orders: { awaiting: 0, inProgress: 0, total: 0 },
      });
  });

  it('returns EMPLOYEE_NOT_FOUND when an administrator selects an unknown employee', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });

    await administrator.agent
      .get(`/dashboard/situation?employeeId=${crypto.randomUUID()}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('rejects invalid and unsupported query parameters with VALIDATION_ERROR', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });

    for (const query of [
      'employeeId=invalid',
      'period=current-month',
      'dateFrom=2026-01-01',
    ]) {
      const response = await administrator.agent
        .get(`/dashboard/situation?${query}`)
        .expect(HttpStatus.BAD_REQUEST);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns zero performance metrics when no data is in the requested interval', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });
    const query =
      'from=2035-01-01T00:00:00.000Z&before=2035-02-01T00:00:00.000Z';

    await administrator.agent
      .get(`/dashboard/performance?${query}`)
      .expect(HttpStatus.OK)
      .expect({
        scope: 'administrator',
        performance: {
          completedOrdersValue: '0.00',
          completedOrders: 0,
          cancelledOrders: 0,
          newClients: 0,
          newEmployees: 0,
          averageCompletedOrderValue: '0.00',
        },
      });
    await employee.agent
      .get(`/dashboard/performance?${query}`)
      .expect(HttpStatus.OK)
      .expect({
        scope: 'employee',
        employeeId: employee.employee.id,
        performance: {
          completedOrdersValue: '0.00',
          completedOrders: 0,
          cancelledOrders: 0,
          averageCompletedOrderValue: '0.00',
          recurringDistinctClients: 0,
          distinctClientsServed: 0,
        },
      });
  });

  it('calculates administrator performance with inclusive start and exclusive end timestamps', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const from = new Date('2030-09-01T00:00:00.000Z');
    const before = new Date('2030-10-01T00:00:00.000Z');
    const query = `from=${from.toISOString()}&before=${before.toISOString()}`;
    const inside = new Date('2030-09-15T12:00:00.000Z');
    const after = new Date('2030-10-01T00:00:00.001Z');
    const beforeFrom = new Date('2030-08-31T23:59:59.999Z');

    await createEmployeeFixture({
      createUser: false,
      criadoEm: beforeFrom,
    });
    await createEmployeeFixture({ createUser: false, criadoEm: from });
    await createEmployeeFixture({
      ativo: false,
      createUser: false,
      criadoEm: inside,
    });
    await createEmployeeFixture({ createUser: false, criadoEm: before });
    await createEmployeeFixture({ createUser: false, criadoEm: after });
    await createPerformanceClientFixture({ criadoEm: beforeFrom });
    await createPerformanceClientFixture({ criadoEm: from });
    await createPerformanceClientFixture({ ativo: false, criadoEm: inside });
    await createPerformanceClientFixture({ criadoEm: before });
    await createPerformanceClientFixture({ criadoEm: after });

    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '7.00',
      concluidoEm: beforeFrom,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '0.10',
      concluidoEm: from,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '0.20',
      concluidoEm: inside,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '8.00',
      concluidoEm: before,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '9.00',
      concluidoEm: after,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: beforeFrom,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: from,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: inside,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: before,
    });
    await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: after,
    });
    const reopenedOrder = await createPerformanceOrderFixture({
      responsavelId: administrator.employee.id,
      status: StatusOrdemServico.AGUARDANDO,
    });
    const reopenedSnapshot = await database.historicoOrdemServico.create({
      data: {
        versao: 1,
        descricao: 'Versão concluída antes da reabertura.',
        valor: '300.00',
        status: StatusOrdemServico.CONCLUIDO,
        visibilidade: Visibilidade.PRIVADA,
        concluidoEm: inside,
        ordemServicoId: reopenedOrder.id,
        responsavelId: administrator.employee.id,
        alteradoPorUsuarioId: administrator.employee.userId!,
      },
    });
    historyIds.push(reopenedSnapshot.id);

    await administrator.agent
      .get(`/dashboard/performance?${query}`)
      .expect(HttpStatus.OK)
      .expect({
        scope: 'administrator',
        performance: {
          completedOrdersValue: '0.30',
          completedOrders: 2,
          cancelledOrders: 2,
          newClients: 2,
          newEmployees: 2,
          averageCompletedOrderValue: '0.15',
        },
      });
  });

  it('uses all current terminal orders and registrations when no interval is sent', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createEmployeeFixture({ createUser: false });
    await createPerformanceOrderFixture({
      responsavelId: employee.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '10.00',
      concluidoEm: new Date('2020-01-01T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: new Date('2020-01-02T00:00:00.000Z'),
    });

    await administrator.agent
      .get('/dashboard/performance')
      .expect(HttpStatus.OK)
      .expect({
        scope: 'administrator',
        performance: {
          completedOrdersValue: '10.00',
          completedOrders: 1,
          cancelledOrders: 1,
          newClients: 2,
          newEmployees: 2,
          averageCompletedOrderValue: '10.00',
        },
      });
  });

  it('credits employee performance by terminal responsibility and detects recurring clients globally', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });
    const otherEmployee = await createEmployeeFixture();
    const from = new Date('2030-09-01T00:00:00.000Z');
    const before = new Date('2030-10-01T00:00:00.000Z');
    const query = `from=${from.toISOString()}&before=${before.toISOString()}`;
    const globallyRecurringClient = await createPerformanceClientFixture();
    const withinPeriodClient = await createPerformanceClientFixture();
    const firstOrderClient = await createPerformanceClientFixture();
    const sameTimestampClient = await createPerformanceClientFixture();

    await createPerformanceOrderFixture({
      responsavelId: otherEmployee.id,
      clienteId: globallyRecurringClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      concluidoEm: new Date('2029-08-01T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: globallyRecurringClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '100.00',
      concluidoEm: new Date('2030-09-02T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: withinPeriodClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '0.10',
      concluidoEm: new Date('2030-09-03T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: withinPeriodClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '0.20',
      concluidoEm: new Date('2030-09-04T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: firstOrderClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '9999999999.99',
      concluidoEm: new Date('2030-09-05T00:00:00.000Z'),
    });
    const sameTimestamp = new Date('2030-09-06T00:00:00.000Z');
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: sameTimestampClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '12.00',
      concluidoEm: sameTimestamp,
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      clienteId: sameTimestampClient.id,
      status: StatusOrdemServico.CONCLUIDO,
      valor: '13.00',
      concluidoEm: sameTimestamp,
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: new Date('2030-09-07T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: employee.employee.id,
      status: StatusOrdemServico.CANCELADO,
      canceladoEm: new Date('2030-09-08T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: otherEmployee.id,
      status: StatusOrdemServico.CONCLUIDO,
      visibilidade: Visibilidade.PUBLICA,
      concluidoEm: new Date('2030-09-09T00:00:00.000Z'),
    });
    await createPerformanceOrderFixture({
      responsavelId: otherEmployee.id,
      status: StatusOrdemServico.CANCELADO,
      visibilidade: Visibilidade.PUBLICA,
      canceladoEm: new Date('2030-09-10T00:00:00.000Z'),
    });

    const expected = {
      scope: 'employee',
      employeeId: employee.employee.id,
      performance: {
        completedOrdersValue: '10000000125.29',
        completedOrders: 6,
        cancelledOrders: 2,
        averageCompletedOrderValue: '1666666687.55',
        recurringDistinctClients: 2,
        distinctClientsServed: 4,
      },
    };
    await employee.agent
      .get(`/dashboard/performance?${query}`)
      .expect(HttpStatus.OK)
      .expect(expected);
    await administrator.agent
      .get(`/dashboard/performance?employeeId=${employee.employee.id}&${query}`)
      .expect(HttpStatus.OK)
      .expect(expected);
  });

  it('credits a completed order to the employee responsible after its transfer', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const previousResponsible = await createEmployeeFixture({
      createUser: false,
    });
    const finalResponsible = await createEmployeeFixture({ createUser: false });
    const from = new Date('2030-09-01T00:00:00.000Z');
    const before = new Date('2030-10-01T00:00:00.000Z');
    const order = await createPerformanceOrderFixture({
      responsavelId: previousResponsible.id,
      status: StatusOrdemServico.AGUARDANDO,
      valor: '50.00',
    });
    await database.ordemServico.update({
      where: { id: order.id },
      data: {
        responsavelId: finalResponsible.id,
        status: StatusOrdemServico.CONCLUIDO,
        concluidoEm: new Date('2030-09-15T00:00:00.000Z'),
      },
    });

    for (const [employeeId, expectedCompletedOrders] of [
      [previousResponsible.id, 0],
      [finalResponsible.id, 1],
    ]) {
      const response = await administrator.agent
        .get(
          `/dashboard/performance?employeeId=${employeeId}&from=${from.toISOString()}&before=${before.toISOString()}`,
        )
        .expect(HttpStatus.OK);
      expect(response.body.performance).toMatchObject({
        completedOrders: expectedCompletedOrders,
        completedOrdersValue: expectedCompletedOrders ? '50.00' : '0.00',
      });
    }
  });

  it('keeps performance authorization and temporal validation independent', async () => {
    const administrator = await createAgent({ perfil: 'ADMINISTRADOR' });
    const employee = await createAgent({ perfil: 'FUNCIONARIO' });
    const otherEmployee = await createEmployeeFixture();
    const inactiveEmployee = await createEmployeeFixture({
      ativo: false,
      createUser: false,
    });
    const interval =
      'from=2030-09-01T00:00:00.000Z&before=2030-10-01T00:00:00.000Z';

    await employee.agent
      .get(`/dashboard/performance?${interval}`)
      .expect(HttpStatus.OK);
    await employee.agent
      .get(
        `/dashboard/performance?employeeId=${employee.employee.id}&${interval}`,
      )
      .expect(HttpStatus.OK);
    await employee.agent
      .get(
        `/dashboard/performance?employeeId=${otherEmployee.id}&${interval}`,
      )
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'DASHBOARD_SCOPE_FORBIDDEN',
        message: 'Employee cannot view another employee dashboard situation',
      });
    await administrator.agent
      .get(
        `/dashboard/performance?employeeId=${crypto.randomUUID()}&${interval}`,
      )
      .expect(HttpStatus.NOT_FOUND);
    await administrator.agent
      .get(
        `/dashboard/performance?employeeId=${inactiveEmployee.id}&${interval}`,
      )
      .expect(HttpStatus.OK);

    for (const query of [
      'from=2030-09-01T00:00:00.000Z',
      'before=2030-10-01T00:00:00.000Z',
      'from=2030-10-01T00:00:00.000Z&before=2030-10-01T00:00:00.000Z',
      'from=2030-10-02T00:00:00.000Z&before=2030-10-01T00:00:00.000Z',
      'from=2030-09-01T00:00:00&before=2030-10-01T00:00:00.000Z',
      `${interval}&period=current-month`,
    ]) {
      const response = await administrator.agent
        .get(`/dashboard/performance?${query}`)
        .expect(HttpStatus.BAD_REQUEST);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('requires a valid session and a completed first access', async () => {
    await request(app)
      .get('/dashboard/situation')
      .expect(HttpStatus.UNAUTHORIZED);
    await request(app)
      .get('/dashboard/performance')
      .expect(HttpStatus.UNAUTHORIZED);
    const pendingEmployee = await createAgent({
      perfil: 'FUNCIONARIO',
      deveAlterarSenha: true,
    });

    await pendingEmployee.agent
      .get('/dashboard/situation')
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });
    await pendingEmployee.agent
      .get('/dashboard/performance')
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });
  });
});
