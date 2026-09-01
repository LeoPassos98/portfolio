import 'dotenv/config';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { setupOpenApi } from '../common/openapi/openapi.setup.js';
import { DatabaseService } from '../database/database.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run employee tests.');
}

type EmployeeFixture = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  ativo: boolean;
  criadoEm: Date;
  usuario: {
    id: string;
    emailLogin: string;
    ativo: boolean;
    perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
  } | null;
};

type EmployeeFixtureOptions = Partial<
  Pick<EmployeeFixture, 'nome' | 'telefone' | 'email' | 'ativo'>
> & {
  conta?: {
    ativo?: boolean;
    perfil?: 'ADMINISTRADOR' | 'FUNCIONARIO';
  };
};

function getSessionId(cookie: string | undefined): string {
  if (!cookie) {
    throw new Error('Expected a session cookie.');
  }

  const cookieValue = cookie.split(';', 1)[0]?.replace('connect.sid=', '');

  if (!cookieValue) {
    throw new Error('Expected a connect.sid cookie.');
  }

  const signedSessionId = decodeURIComponent(cookieValue);
  const sessionId = signedSessionId.slice(2).split('.', 1)[0];

  if (!signedSessionId.startsWith('s:') || !sessionId) {
    throw new Error('Expected a signed session identifier.');
  }

  return sessionId;
}

describe('EmployeesController', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let testingModule: TestingModule;
  let verificationPool: Pool | undefined;
  const employeeIds: string[] = [];
  const sessionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();

    const sessionStoreService = nestApplication.get(SessionStoreService);
    nestApplication.use(sessionStoreService.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions('http://localhost:5173'));
    setupOpenApi(nestApplication);
    await nestApplication.init();

    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    if (sessionIds.length > 0) {
      await verificationPool?.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    }

    if (userIds.length > 0) {
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    }

    if (employeeIds.length > 0) {
      await database.funcionario.deleteMany({
        where: { id: { in: employeeIds } },
      });
    }

    employeeIds.length = 0;
    sessionIds.length = 0;
    userIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool?.end();
    await nestApplication.close();
  });

  async function createEmployeeFixture(
    options: EmployeeFixtureOptions = {},
  ): Promise<EmployeeFixture> {
    const suffix = crypto.randomUUID();
    const employee = await database.funcionario.create({
      data: {
        nome: options.nome ?? `Funcionário ${suffix}`,
        telefone: options.telefone ?? '11999999999',
        email: options.email ?? `funcionario-${suffix}@example.test`,
        ativo: options.ativo ?? true,
      },
    });
    employeeIds.push(employee.id);

    if (!options.conta) {
      return { ...employee, usuario: null };
    }

    const usuario = await database.usuario.create({
      data: {
        emailLogin: `usuario-${suffix}@example.test`,
        senhaHash: 'test-only-password-hash',
        ativo: options.conta.ativo ?? true,
        perfil: options.conta.perfil ?? 'FUNCIONARIO',
        deveAlterarSenha: false,
        funcionarioId: employee.id,
      },
    });
    userIds.push(usuario.id);

    return { ...employee, usuario };
  }

  async function createAuthenticatedAgent({
    perfil = 'ADMINISTRADOR',
    deveAlterarSenha = false,
  }: Partial<{
    perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
    deveAlterarSenha: boolean;
  }> = {}): Promise<SuperAgentTest> {
    const accountEmployee = await createEmployeeFixture();
    const user = await database.usuario.create({
      data: {
        emailLogin: `auth-${crypto.randomUUID()}@example.test`,
        senhaHash: 'test-only-password-hash',
        perfil,
        deveAlterarSenha,
        funcionarioId: accountEmployee.id,
      },
    });
    userIds.push(user.id);

    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sessionId = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.push(sessionId);
    const update = await verificationPool!.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sessionId, user.id],
    );

    expect(update.rowCount).toBe(1);

    return agent;
  }

  function listItem(employee: EmployeeFixture) {
    return {
      id: employee.id,
      nome: employee.nome,
      telefone: employee.telefone,
      email: employee.email,
      ativo: employee.ativo,
      conta: employee.usuario
        ? {
            ativo: employee.usuario.ativo,
            perfil: employee.usuario.perfil,
          }
        : null,
    };
  }

  it('allows an administrator to list active employees by default', async () => {
    const agent = await createAuthenticatedAgent();
    const activeEmployee = await createEmployeeFixture({
      nome: `Funcionário Ativo ${crypto.randomUUID()}`,
    });
    await createEmployeeFixture({
      nome: activeEmployee.nome.replace('Ativo', 'Inativo'),
      ativo: false,
    });

    await agent
      .get(`/employees?search=${encodeURIComponent(activeEmployee.nome)}`)
      .expect(HttpStatus.OK)
      .expect([listItem(activeEmployee)]);
  });

  it('filters inactive and all employees', async () => {
    const agent = await createAuthenticatedAgent();
    const group = crypto.randomUUID();
    const activeEmployee = await createEmployeeFixture({
      nome: `Ana Ativa ${group}`,
    });
    const inactiveEmployee = await createEmployeeFixture({
      nome: `Bruno Inativo ${group}`,
      ativo: false,
    });

    await agent
      .get(`/employees?status=inactive&search=${group}`)
      .expect(HttpStatus.OK)
      .expect([listItem(inactiveEmployee)]);

    const allResponse = await agent
      .get(`/employees?status=all&search=${group}`)
      .expect(HttpStatus.OK);

    expect(allResponse.body).toEqual([
      listItem(activeEmployee),
      listItem(inactiveEmployee),
    ]);
  });

  it('searches employee name and contact email case-insensitively', async () => {
    const agent = await createAuthenticatedAgent();
    const byName = await createEmployeeFixture({ nome: 'Maria da Silva' });
    const byEmail = await createEmployeeFixture({
      nome: 'Outro Funcionário',
      email: 'Contato.Importante@Example.test',
    });

    const nameResponse = await agent
      .get('/employees?search=%20mArIa%20DA%20sIlVa%20')
      .expect(HttpStatus.OK);
    const emailResponse = await agent
      .get('/employees?search=IMPORTANTE%40example.test')
      .expect(HttpStatus.OK);

    expect(nameResponse.body.map(({ id }) => id)).toEqual([byName.id]);
    expect(emailResponse.body.map(({ id }) => id)).toEqual([byEmail.id]);
  });

  it('searches an employee phone using a formatted numeric term', async () => {
    const agent = await createAuthenticatedAgent();
    const employee = await createEmployeeFixture({
      nome: 'Telefone Encontrado',
      telefone: '11987654321',
    });

    const response = await agent
      .get('/employees?search=(11)%2098765-4321')
      .expect(HttpStatus.OK);

    expect(response.body.map(({ id }) => id)).toEqual([employee.id]);
  });

  it('orders results by name and then id', async () => {
    const agent = await createAuthenticatedAgent();
    const group = crypto.randomUUID();
    const ana = await createEmployeeFixture({ nome: `Ana ${group}` });
    const sameNameFirst = await createEmployeeFixture({
      nome: `Mesmo Nome ${group}`,
    });
    const sameNameSecond = await createEmployeeFixture({
      nome: `Mesmo Nome ${group}`,
    });
    const zoe = await createEmployeeFixture({ nome: `Zoe ${group}` });

    const response = await agent
      .get(`/employees?status=all&search=${group}`)
      .expect(HttpStatus.OK);

    expect(response.body.map(({ id }) => id)).toEqual([
      ana.id,
      ...[sameNameFirst.id, sameNameSecond.id].sort(),
      zoe.id,
    ]);
  });

  it('returns optional active and inactive accounts with both profiles', async () => {
    const agent = await createAuthenticatedAgent();
    const group = crypto.randomUUID();
    const withoutAccount = await createEmployeeFixture({
      nome: `Ana Sem Conta ${group}`,
    });
    const activeAdministrator = await createEmployeeFixture({
      nome: `Bruno Administrador ${group}`,
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const inactiveEmployeeAccount = await createEmployeeFixture({
      nome: `Carla Conta Inativa ${group}`,
      conta: { ativo: false, perfil: 'FUNCIONARIO' },
    });

    await agent
      .get(`/employees?status=all&search=${group}`)
      .expect(HttpStatus.OK)
      .expect([
        listItem(withoutAccount),
        listItem(activeAdministrator),
        listItem(inactiveEmployeeAccount),
      ]);
  });

  it('returns active and inactive employee detail with an optional account', async () => {
    const agent = await createAuthenticatedAgent();
    const withoutAccount = await createEmployeeFixture({
      nome: 'Funcionário Sem Conta',
      ativo: false,
    });
    const withAccount = await createEmployeeFixture({
      nome: 'Funcionário Com Conta',
      conta: { ativo: false, perfil: 'ADMINISTRADOR' },
    });

    await agent
      .get(`/employees/${withoutAccount.id}`)
      .expect(HttpStatus.OK)
      .expect({
        id: withoutAccount.id,
        nome: withoutAccount.nome,
        telefone: withoutAccount.telefone,
        email: withoutAccount.email,
        ativo: false,
        criadoEm: withoutAccount.criadoEm.toISOString(),
        conta: null,
      });

    await agent
      .get(`/employees/${withAccount.id}`)
      .expect(HttpStatus.OK)
      .expect({
        id: withAccount.id,
        nome: withAccount.nome,
        telefone: withAccount.telefone,
        email: withAccount.email,
        ativo: true,
        criadoEm: withAccount.criadoEm.toISOString(),
        conta: {
          emailLogin: withAccount.usuario!.emailLogin,
          ativo: false,
          perfil: 'ADMINISTRADOR',
        },
      });
  });

  it('rejects an invalid employee id with the global validation contract', async () => {
    const agent = await createAuthenticatedAgent();

    await agent
      .get('/employees/not-a-uuid')
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('returns EMPLOYEE_NOT_FOUND for an unknown valid employee id', async () => {
    const agent = await createAuthenticatedAgent();

    await agent
      .get(`/employees/${crypto.randomUUID()}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('does not expose account secrets, sessions, orders, or history', async () => {
    const agent = await createAuthenticatedAgent();
    const employee = await createEmployeeFixture({
      conta: { perfil: 'FUNCIONARIO' },
    });

    const response = await agent
      .get(`/employees/${employee.id}`)
      .expect(HttpStatus.OK);

    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body).not.toHaveProperty('deveAlterarSenha');
    expect(response.body).not.toHaveProperty('session');
    expect(response.body).not.toHaveProperty('ordensComoResponsavel');
    expect(response.body).not.toHaveProperty('historicosComoResponsavel');
    expect(response.body.conta).not.toHaveProperty('senhaHash');
    expect(response.body.conta).not.toHaveProperty('deveAlterarSenha');
    expect(Object.keys(response.body).sort()).toEqual([
      'ativo',
      'conta',
      'criadoEm',
      'email',
      'id',
      'nome',
      'telefone',
    ]);
  });

  it('requires a session, completed first access, and an administrator role', async () => {
    await request(app).get('/employees').expect(HttpStatus.UNAUTHORIZED).expect({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'AUTH_UNAUTHENTICATED',
      message: 'Authentication required',
    });

    const pendingAgent = await createAuthenticatedAgent({
      deveAlterarSenha: true,
    });
    await pendingAgent.get('/employees').expect(HttpStatus.FORBIDDEN).expect({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing the application',
    });

    const employeeAgent = await createAuthenticatedAgent({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.get('/employees').expect(HttpStatus.FORBIDDEN).expect({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'AUTH_FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
    await employeeAgent
      .get(`/employees/${crypto.randomUUID()}`)
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
  });

  it('does not require CSRF for reads', async () => {
    const agent = await createAuthenticatedAgent();

    await agent.get('/employees').expect(HttpStatus.OK);
  });

  it('documents employee reads and nullable account DTOs in OpenAPI', async () => {
    const response = await request(app)
      .get('/api/docs/openapi.json')
      .expect(HttpStatus.OK);
    const listOperation = response.body.paths['/employees'].get;
    const detailOperation = response.body.paths['/employees/{id}'].get;

    expect(Object.keys(response.body.paths['/employees'])).toEqual(['get']);
    expect(Object.keys(response.body.paths['/employees/{id}'])).toEqual(['get']);
    expect(listOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'status', in: 'query' }),
        expect.objectContaining({ name: 'search', in: 'query' }),
      ]),
    );
    for (const status of ['200', '400', '401', '403']) {
      expect(listOperation.responses).toHaveProperty(status);
    }
    expect(detailOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
      ]),
    );
    for (const status of ['200', '400', '401', '403', '404']) {
      expect(detailOperation.responses).toHaveProperty(status);
    }
    expect(
      response.body.components.schemas.EmployeeListItemResponse.properties
        .conta,
    ).toMatchObject({ nullable: true });
    expect(
      response.body.components.schemas.EmployeeDetailResponse.properties.conta,
    ).toMatchObject({ nullable: true });
  });
});
