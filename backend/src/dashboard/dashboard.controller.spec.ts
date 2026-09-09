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

  it('requires a valid session and a completed first access', async () => {
    await request(app)
      .get('/dashboard/situation')
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
  });
});
