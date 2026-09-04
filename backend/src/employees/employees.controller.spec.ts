import 'dotenv/config';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { StatusOrdemServico } from '../generated/prisma/client.js';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { setupOpenApi } from '../common/openapi/openapi.setup.js';
import { DatabaseService } from '../database/database.service.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { PasswordService } from '../auth/password/password.service.js';

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
    senhaHash: string;
    ativo: boolean;
    perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
    deveAlterarSenha: boolean;
  } | null;
};

type EmployeeAccountFixture = NonNullable<EmployeeFixture['usuario']>;

type EmployeeFixtureOptions = Partial<
  Pick<EmployeeFixture, 'nome' | 'telefone' | 'email' | 'ativo'>
> & {
  conta?: Partial<
    Pick<
      EmployeeAccountFixture,
      'emailLogin' | 'senhaHash' | 'ativo' | 'perfil' | 'deveAlterarSenha'
    >
  >;
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
  let passwordService: PasswordService;
  const employeeIds: string[] = [];
  const clientIds: string[] = [];
  const orderIds: string[] = [];
  const historyIds: string[] = [];
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
    passwordService = nestApplication.get(PasswordService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    if (sessionIds.length > 0) {
      await verificationPool?.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [sessionIds],
      );
    }

    if (historyIds.length > 0) {
      await database.historicoOrdemServico.deleteMany({
        where: { id: { in: historyIds } },
      });
    }

    if (orderIds.length > 0) {
      await database.ordemServico.deleteMany({
        where: { id: { in: orderIds } },
      });
    }

    if (userIds.length > 0) {
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
    }

    if (employeeIds.length > 0) {
      await database.funcionario.deleteMany({
        where: { id: { in: employeeIds } },
      });
    }

    if (clientIds.length > 0) {
      await database.cliente.deleteMany({ where: { id: { in: clientIds } } });
    }

    clientIds.length = 0;
    orderIds.length = 0;
    historyIds.length = 0;
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
        emailLogin:
          options.conta.emailLogin ?? `usuario-${suffix}@example.test`,
        senhaHash: options.conta.senhaHash ?? 'test-only-password-hash',
        ativo: options.conta.ativo ?? true,
        perfil: options.conta.perfil ?? 'FUNCIONARIO',
        deveAlterarSenha: options.conta.deveAlterarSenha ?? false,
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

  function createEmployeeBody(overrides: Record<string, unknown> = {}) {
    return {
      nome: 'Maria da Silva',
      telefone: '11999999999',
      email: 'maria@example.test',
      status: 'active',
      ...overrides,
    };
  }

  function updateEmployeeBody(overrides: Record<string, unknown> = {}) {
    return {
      nome: 'Maria da Silva Atualizada',
      telefone: '11988887777',
      email: 'maria.atualizada@example.test',
      ...overrides,
    };
  }

  function updateEmployeeStatusBody(overrides: Record<string, unknown> = {}) {
    return {
      status: 'inactive',
      ...overrides,
    };
  }

  function updateEmployeeAccessStatusBody(
    overrides: Record<string, unknown> = {},
  ) {
    return {
      status: 'inactive',
      ...overrides,
    };
  }

  function updateEmployeeAccessProfileBody(
    overrides: Record<string, unknown> = {},
  ) {
    return {
      profile: 'administrator',
      ...overrides,
    };
  }

  function createEmployeeAccessBody(overrides: Record<string, unknown> = {}) {
    return {
      loginEmail: 'maria@login.example.test',
      profile: 'employee',
      initialPassword: 'senha inicial segura',
      confirmPassword: 'senha inicial segura',
      ...overrides,
    };
  }

  async function createSessionForUser(usuarioId: string): Promise<{
    agent: SuperAgentTest;
    csrfToken: string;
    sessionId: string;
  }> {
    const agent = request.agent(app);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const sessionId = getSessionId(response.headers['set-cookie']?.[0]);
    sessionIds.push(sessionId);
    const update = await verificationPool!.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sessionId, usuarioId],
    );

    expect(update.rowCount).toBe(1);

    return {
      agent,
      csrfToken: response.body.csrfToken as string,
      sessionId,
    };
  }

  async function createOrderFixture(
    employeeId: string,
    status: StatusOrdemServico,
  ) {
    const client = await database.cliente.create({
      data: {
        nome: `Cliente ${crypto.randomUUID()}`,
        telefone: '11999991111',
        documento: null,
        email: null,
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        complemento: null,
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    });
    clientIds.push(client.id);
    const order = await database.ordemServico.create({
      data: {
        numero: `OS-${crypto.randomUUID()}`,
        descricao: 'OS de teste da situação do funcionário.',
        valor: '100.00',
        status,
        clienteId: client.id,
        responsavelId: employeeId,
      },
    });
    orderIds.push(order.id);

    return order;
  }

  async function waitForActiveAdministratorCount(
    expectedCount: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const activeAdministrators = await database.usuario.count({
        where: { perfil: 'ADMINISTRADOR', ativo: true },
      });

      if (activeAdministrators === expectedCount) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(
      `Expected ${expectedCount} active administrator accounts after fixture cleanup.`,
    );
  }

  async function createAuthenticatedAgentWithCsrf(
    options: Partial<{
      perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
      deveAlterarSenha: boolean;
    }> = {},
  ): Promise<{ agent: SuperAgentTest; csrfToken: string }> {
    const agent = await createAuthenticatedAgent(options);
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);

    return { agent, csrfToken: response.body.csrfToken as string };
  }

  it('allows an administrator to create an active employee without an account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const response = await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(createEmployeeBody())
      .expect(HttpStatus.CREATED);
    employeeIds.push(response.body.id as string);

    const persisted = await database.funcionario.findUniqueOrThrow({
      where: { id: response.body.id as string },
    });

    expect(response.body).toEqual({
      id: persisted.id,
      nome: 'Maria da Silva',
      telefone: '11999999999',
      email: 'maria@example.test',
      ativo: true,
      criadoEm: persisted.criadoEm.toISOString(),
      conta: null,
    });
    await expect(
      database.usuario.findUnique({
        where: { funcionarioId: persisted.id },
      }),
    ).resolves.toBeNull();
    expect(response.body).not.toHaveProperty('senha');
    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body).not.toHaveProperty('emailLogin');
  });

  it('allows an administrator to create an inactive employee', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const response = await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeBody({ nome: 'Funcionário Inativo', status: 'inactive' }),
      )
      .expect(HttpStatus.CREATED);
    employeeIds.push(response.body.id as string);

    await expect(
      database.funcionario.findUniqueOrThrow({
        where: { id: response.body.id as string },
      }),
    ).resolves.toMatchObject({ ativo: false });
    expect(response.body).toMatchObject({ ativo: false, conta: null });
  });

  it('normalizes employee creation input before persisting it', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const response = await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeBody({
          nome: '  Maria Normalizada  ',
          telefone: '+55 (11) 99999-9999',
          email: '  Maria.Contato@Example.test  ',
        }),
      )
      .expect(HttpStatus.CREATED);
    employeeIds.push(response.body.id as string);

    expect(response.body).toMatchObject({
      nome: 'Maria Normalizada',
      telefone: '11999999999',
      email: 'Maria.Contato@Example.test',
    });
  });

  it('allows duplicate employee contact phones and emails', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const sharedContact = {
      telefone: '11999999999',
      email: 'contato-compartilhado@example.test',
    };
    const firstResponse = await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeBody({ nome: 'Primeiro Funcionário', ...sharedContact }),
      )
      .expect(HttpStatus.CREATED);
    const secondResponse = await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeBody({ nome: 'Segundo Funcionário', ...sharedContact }),
      )
      .expect(HttpStatus.CREATED);
    employeeIds.push(
      firstResponse.body.id as string,
      secondResponse.body.id as string,
    );

    expect(firstResponse.body.id).not.toBe(secondResponse.body.id);
    await expect(
      database.funcionario.count({ where: sharedContact }),
    ).resolves.toBe(2);
  });

  it.each([
    ['empty name', { nome: '   ' }],
    ['name shorter than two characters', { nome: ' A ' }],
    ['name longer than 120 characters', { nome: 'a'.repeat(121) }],
    ['invalid phone', { telefone: '119999999' }],
    ['empty email', { email: '   ' }],
    ['invalid email', { email: 'email-inválido' }],
    ['invalid status', { status: 'pending' }],
  ])('rejects creation with %s', async (_description, overrides) => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .post('/employees')
      .set('X-CSRF-Token', csrfToken)
      .send(createEmployeeBody(overrides))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it.each([
    ['ativo', false],
    ['conta', { emailLogin: 'indevido@example.test' }],
    ['perfil', 'ADMINISTRADOR'],
    ['senhaHash', 'indevido'],
    ['campoInesperado', 'valor'],
  ])(
    'rejects administrative, credential, or unexpected field %s',
    async (field, value) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

      await agent
        .post('/employees')
        .set('X-CSRF-Token', csrfToken)
        .send({ ...createEmployeeBody(), [field]: value })
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
          });
        });
    },
  );

  it('requires a session, completed first access, an administrator role, and CSRF to create', async () => {
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .post('/employees')
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(createEmployeeBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .post('/employees')
      .set('X-CSRF-Token', pending.csrfToken)
      .send(createEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employee = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employee.agent
      .post('/employees')
      .set('X-CSRF-Token', employee.csrfToken)
      .send(createEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .post('/employees')
      .send(createEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
  });

  it('allows an administrator to create an employee account with a normalized login email and temporary password', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      email: 'maria.contato@example.test',
    });
    const initialPassword = '  senha inicial segura  ';
    const response = await agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeAccessBody({
          loginEmail: '  Maria.Login@Example.Test  ',
          initialPassword,
          confirmPassword: initialPassword,
        }),
      )
      .expect(HttpStatus.CREATED);
    const persisted = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: employee.id },
    });
    userIds.push(persisted.id);

    expect(response.body).toEqual({
      id: employee.id,
      nome: employee.nome,
      telefone: employee.telefone,
      email: employee.email,
      ativo: employee.ativo,
      criadoEm: employee.criadoEm.toISOString(),
      conta: {
        emailLogin: 'maria.login@example.test',
        ativo: true,
        perfil: 'FUNCIONARIO',
      },
    });
    expect(persisted).toMatchObject({
      emailLogin: 'maria.login@example.test',
      funcionarioId: employee.id,
      perfil: 'FUNCIONARIO',
      ativo: true,
      deveAlterarSenha: true,
    });
    expect(persisted.senhaHash).not.toBe(initialPassword);
    await expect(
      passwordService.verify(persisted.senhaHash, initialPassword),
    ).resolves.toBe(true);
    expect(persisted).not.toHaveProperty('confirmPassword');
    expect(response.body).not.toHaveProperty('initialPassword');
    expect(response.body).not.toHaveProperty('confirmPassword');
    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body.conta).not.toHaveProperty('senhaHash');
  });

  it('creates an inactive account for an inactive employee and keeps it inactive after reactivation', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({ ativo: false });
    const loginEmail = `conta-inativa-${crypto.randomUUID()}@example.test`;
    const initialPassword = 'senha inicial de conta inativa';
    const response = await agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeAccessBody({
          loginEmail,
          initialPassword,
          confirmPassword: initialPassword,
        }),
      )
      .expect(HttpStatus.CREATED);
    const persisted = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: employee.id },
    });
    userIds.push(persisted.id);

    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: false,
      conta: {
        emailLogin: loginEmail,
        ativo: false,
        perfil: 'FUNCIONARIO',
      },
    });
    expect(persisted).toMatchObject({
      ativo: false,
      deveAlterarSenha: true,
    });
    await expect(
      passwordService.verify(persisted.senhaHash, initialPassword),
    ).resolves.toBe(true);

    const loginAgent = request.agent(app);
    const loginCsrf = await loginAgent.get('/auth/csrf').expect(HttpStatus.OK);
    sessionIds.push(getSessionId(loginCsrf.headers['set-cookie']?.[0]));
    await loginAgent
      .post('/auth/login')
      .set('X-CSRF-Token', loginCsrf.body.csrfToken as string)
      .send({ email: loginEmail, password: initialPassword })
      .expect(HttpStatus.UNAUTHORIZED);

    const reactivated = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody({ status: 'active' }))
      .expect(HttpStatus.OK);

    expect(reactivated.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: { ativo: false },
    });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ).resolves.toMatchObject({ ativo: false, deveAlterarSenha: true });
  });

  it('persists the administrator profile when creating an employee account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();
    const response = await agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeAccessBody({
          loginEmail: 'administrador-criado@example.test',
          profile: 'administrator',
        }),
      )
      .expect(HttpStatus.CREATED);
    const persisted = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: employee.id },
    });
    userIds.push(persisted.id);

    expect(response.body.conta).toEqual({
      emailLogin: 'administrador-criado@example.test',
      ativo: true,
      perfil: 'ADMINISTRADOR',
    });
    expect(persisted.perfil).toBe('ADMINISTRADOR');
  });

  it('rejects a normalized duplicate login email without creating another account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const firstEmployee = await createEmployeeFixture();
    const secondEmployee = await createEmployeeFixture();
    const firstResponse = await agent
      .post(`/employees/${firstEmployee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeAccessBody({ loginEmail: 'Maria.Login@Example.Test' }),
      )
      .expect(HttpStatus.CREATED);
    const firstAccount = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: firstEmployee.id },
    });
    userIds.push(firstAccount.id);

    await agent
      .post(`/employees/${secondEmployee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        createEmployeeAccessBody({
          loginEmail: '  maria.login@example.test  ',
        }),
      )
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'LOGIN_EMAIL_ALREADY_EXISTS',
        message: 'Login email already exists',
      });

    expect(firstResponse.body.conta.emailLogin).toBe(
      'maria.login@example.test',
    );
    await expect(
      database.usuario.findUnique({
        where: { funcionarioId: secondEmployee.id },
      }),
    ).resolves.toBeNull();
    await expect(
      database.usuario.count({
        where: { emailLogin: 'maria.login@example.test' },
      }),
    ).resolves.toBe(1);
  });

  it('rejects creating a second account for the same employee', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      conta: { emailLogin: 'conta-existente@example.test' },
    });

    await agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'EMPLOYEE_ACCESS_ALREADY_EXISTS',
        message: 'Employee already has an access account',
      });
  });

  it('returns EMPLOYEE_NOT_FOUND when creating an account for an unknown employee', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .post(`/employees/${crypto.randomUUID()}/account`)
      .set('X-CSRF-Token', csrfToken)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it.each([
    ['invalid employee id', '/employees/not-a-uuid/account', {}],
    ['invalid login email', undefined, { loginEmail: 'email-inválido' }],
    ['invalid profile', undefined, { profile: 'manager' }],
    [
      'password shorter than eight characters',
      undefined,
      { initialPassword: '1234567', confirmPassword: '1234567' },
    ],
    [
      'password longer than 128 characters',
      undefined,
      { initialPassword: 'a'.repeat(129), confirmPassword: 'a'.repeat(129) },
    ],
    [
      'different password confirmation',
      undefined,
      { confirmPassword: 'senha inicial diferente' },
    ],
    ['unexpected field', undefined, { status: 'active' }],
  ])(
    'rejects account creation with %s',
    async (_description, route, overrides) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
      const employee = await createEmployeeFixture();

      await agent
        .post(route ?? `/employees/${employee.id}/account`)
        .set('X-CSRF-Token', csrfToken)
        .send(createEmployeeAccessBody(overrides))
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
          });
        });
    },
  );

  it('requires session, completed first access, administrator role, and CSRF to create an account', async () => {
    const employee = await createEmployeeFixture();
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', pending.csrfToken)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employeeAgent = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.agent
      .post(`/employees/${employee.id}/account`)
      .set('X-CSRF-Token', employeeAgent.csrfToken)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .post(`/employees/${employee.id}/account`)
      .send(createEmployeeAccessBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
  });

  it('converts a concurrent duplicate login email constraint violation to a conflict response', async () => {
    const firstEmployee = await createEmployeeFixture();
    const secondEmployee = await createEmployeeFixture();
    const firstAdministrator = await createAuthenticatedAgentWithCsrf();
    const secondAdministrator = await createAuthenticatedAgentWithCsrf();
    const loginEmail = `concorrente-${crypto.randomUUID()}@example.test`;
    const responses = await Promise.all([
      firstAdministrator.agent
        .post(`/employees/${firstEmployee.id}/account`)
        .set('X-CSRF-Token', firstAdministrator.csrfToken)
        .send(createEmployeeAccessBody({ loginEmail })),
      secondAdministrator.agent
        .post(`/employees/${secondEmployee.id}/account`)
        .set('X-CSRF-Token', secondAdministrator.csrfToken)
        .send(createEmployeeAccessBody({ loginEmail })),
    ]);
    const accounts = await database.usuario.findMany({
      where: { emailLogin: loginEmail },
    });
    userIds.push(...accounts.map((account) => account.id));
    const conflict = responses.find(
      (response) => response.status === HttpStatus.CONFLICT,
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      HttpStatus.CREATED,
      HttpStatus.CONFLICT,
    ]);
    expect(conflict?.body).toEqual({
      statusCode: HttpStatus.CONFLICT,
      code: 'LOGIN_EMAIL_ALREADY_EXISTS',
      message: 'Login email already exists',
    });
    expect(accounts).toHaveLength(1);
  });

  it('never leaves an active account when account creation and employee deactivation race', async () => {
    const employee = await createEmployeeFixture({ ativo: true });
    const accountAdministrator = await createAuthenticatedAgentWithCsrf();
    const statusAdministrator = await createAuthenticatedAgentWithCsrf();
    const responses = await Promise.all([
      accountAdministrator.agent
        .post(`/employees/${employee.id}/account`)
        .set('X-CSRF-Token', accountAdministrator.csrfToken)
        .send(
          createEmployeeAccessBody({
            loginEmail: `concorrencia-${crypto.randomUUID()}@example.test`,
          }),
        ),
      statusAdministrator.agent
        .patch(`/employees/${employee.id}/status`)
        .set('X-CSRF-Token', statusAdministrator.csrfToken)
        .send(updateEmployeeStatusBody()),
    ]);
    const [persistedEmployee, persistedAccount] = await Promise.all([
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ]);
    userIds.push(persistedAccount.id);

    expect(responses.map((response) => response.status).sort()).toEqual([
      HttpStatus.OK,
      HttpStatus.CREATED,
    ]);
    expect(persistedEmployee.ativo).toBe(false);
    expect(persistedAccount.ativo).toBe(false);
  });

  it('promotes an employee account, changes only its profile, revokes target sessions, and applies the new profile on login', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const password = 'senha preservada no perfil';
    const employee = await createEmployeeFixture({
      conta: {
        emailLogin: `promocao-${crypto.randomUUID()}@example.test`,
        senhaHash: await passwordService.hash(password),
        perfil: 'FUNCIONARIO',
        deveAlterarSenha: false,
      },
    });
    const employeeBefore = await database.funcionario.findUniqueOrThrow({
      where: { id: employee.id },
    });
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    const firstTargetSession = await createSessionForUser(employee.usuario!.id);
    const secondTargetSession = await createSessionForUser(
      employee.usuario!.id,
    );
    const otherEmployee = await createEmployeeFixture({ conta: {} });
    const otherSession = await createSessionForUser(otherEmployee.usuario!.id);

    const response = await agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.OK);
    const [employeeAfter, accountAfter, targetSessions, otherSessions] =
      await Promise.all([
        database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
        database.usuario.findUniqueOrThrow({
          where: { id: employee.usuario!.id },
        }),
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = ANY($1)',
          [[firstTargetSession.sessionId, secondTargetSession.sessionId]],
        ),
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = $1',
          [otherSession.sessionId],
        ),
      ]);

    expect(response.body).toEqual({
      id: employee.id,
      nome: employee.nome,
      telefone: employee.telefone,
      email: employee.email,
      ativo: true,
      criadoEm: employee.criadoEm.toISOString(),
      conta: {
        emailLogin: accountBefore.emailLogin,
        ativo: true,
        perfil: 'ADMINISTRADOR',
      },
    });
    expect(response.body.conta).not.toHaveProperty('senhaHash');
    expect(response.body.conta).not.toHaveProperty('deveAlterarSenha');
    expect(employeeAfter).toEqual(employeeBefore);
    expect(accountAfter).toEqual({
      ...accountBefore,
      perfil: 'ADMINISTRADOR',
    });
    expect(targetSessions.rowCount).toBe(0);
    expect(otherSessions.rowCount).toBe(1);
    await firstTargetSession.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED);
    await secondTargetSession.agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', secondTargetSession.csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
    await otherSession.agent.get('/auth/session').expect(HttpStatus.OK);

    const loginAgent = request.agent(app);
    const loginCsrfResponse = await loginAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(getSessionId(loginCsrfResponse.headers['set-cookie']?.[0]));
    const loginResponse = await loginAgent
      .post('/auth/login')
      .set('X-CSRF-Token', loginCsrfResponse.body.csrfToken as string)
      .send({ email: accountBefore.emailLogin, password })
      .expect(HttpStatus.OK);
    sessionIds.push(getSessionId(loginResponse.headers['set-cookie']?.[0]));
    expect(loginResponse.body).toMatchObject({
      id: employee.usuario!.id,
      perfil: 'ADMINISTRADOR',
      funcionarioId: employee.id,
      deveAlterarSenha: false,
    });
  });

  it('demotes an active administrator when another remains and preserves credentials and employee data', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      conta: {
        emailLogin: `despromocao-${crypto.randomUUID()}@example.test`,
        senhaHash: 'hash-administrador-preservado',
        perfil: 'ADMINISTRADOR',
        deveAlterarSenha: true,
      },
    });
    const employeeBefore = await database.funcionario.findUniqueOrThrow({
      where: { id: employee.id },
    });
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    await waitForActiveAdministratorCount(2);

    const response = await agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessProfileBody({ profile: 'employee' }))
      .expect(HttpStatus.OK);

    await expect(
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
    ).resolves.toEqual(employeeBefore);
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      }),
    ).resolves.toEqual({ ...accountBefore, perfil: 'FUNCIONARIO' });
    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: employee.ativo,
      conta: {
        emailLogin: accountBefore.emailLogin,
        ativo: accountBefore.ativo,
        perfil: 'FUNCIONARIO',
      },
    });
  });

  it('changes the profile of an inactive account for an inactive employee without reactivating either', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      ativo: false,
      conta: {
        ativo: false,
        perfil: 'ADMINISTRADOR',
        senhaHash: 'hash-inativo-preservado',
        deveAlterarSenha: true,
      },
    });
    const employeeBefore = await database.funcionario.findUniqueOrThrow({
      where: { id: employee.id },
    });
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    const staleSession = await createSessionForUser(employee.usuario!.id);

    const response = await agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessProfileBody({ profile: 'employee' }))
      .expect(HttpStatus.OK);

    await expect(
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
    ).resolves.toEqual(employeeBefore);
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      }),
    ).resolves.toEqual({ ...accountBefore, perfil: 'FUNCIONARIO' });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        staleSession.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: false,
      conta: { ativo: false, perfil: 'FUNCIONARIO' },
    });
  });

  it.each([
    ['administrator', 'ADMINISTRADOR', true],
    ['employee', 'FUNCIONARIO', false],
  ] as const)(
    'repeats the current %s profile without changing data or revoking sessions',
    async (profile, persistedProfile, deveAlterarSenha) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
      const employee = await createEmployeeFixture({
        conta: {
          perfil: persistedProfile,
          senhaHash: `hash-idempotente-${profile}`,
          deveAlterarSenha,
        },
      });
      const employeeBefore = await database.funcionario.findUniqueOrThrow({
        where: { id: employee.id },
      });
      const accountBefore = await database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      });
      const existingSession = await createSessionForUser(employee.usuario!.id);

      const firstResponse = await agent
        .patch(`/employees/${employee.id}/account/profile`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeAccessProfileBody({ profile }))
        .expect(HttpStatus.OK);
      const secondResponse = await agent
        .patch(`/employees/${employee.id}/account/profile`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeAccessProfileBody({ profile }))
        .expect(HttpStatus.OK);

      expect(secondResponse.body).toEqual(firstResponse.body);
      await expect(
        database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
      ).resolves.toEqual(employeeBefore);
      await expect(
        database.usuario.findUniqueOrThrow({
          where: { id: employee.usuario!.id },
        }),
      ).resolves.toEqual(accountBefore);
      await expect(
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = $1',
          [existingSession.sessionId],
        ),
      ).resolves.toMatchObject({ rowCount: 1 });
      await existingSession.agent.get('/auth/session').expect(HttpStatus.OK);
    },
  );

  it('returns EMPLOYEE_NOT_FOUND when changing the profile for an unknown employee', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .patch(`/employees/${crypto.randomUUID()}/account/profile`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('returns EMPLOYEE_ACCESS_NOT_FOUND without creating an account when changing profile', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();

    await agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_ACCESS_NOT_FOUND',
        message: 'Employee access account not found',
      });
    await expect(
      database.usuario.findUnique({ where: { funcionarioId: employee.id } }),
    ).resolves.toBeNull();
  });

  it.each([
    ['invalid id', 'not-a-uuid', updateEmployeeAccessProfileBody()],
    [
      'invalid profile',
      crypto.randomUUID(),
      updateEmployeeAccessProfileBody({ profile: 'manager' }),
    ],
    [
      'unexpected field',
      crypto.randomUUID(),
      updateEmployeeAccessProfileBody({ ativo: false }),
    ],
  ])(
    'rejects access profile update with %s',
    async (_description, id, body) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

      await agent
        .patch(`/employees/${id}/account/profile`)
        .set('X-CSRF-Token', csrfToken)
        .send(body)
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body: responseBody }) => {
          expect(responseBody).toMatchObject({
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
          });
        });
    },
  );

  it('requires session, completed first access, administrator role, and valid CSRF to change access profile', async () => {
    const employee = await createEmployeeFixture({ conta: {} });
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', pending.csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employeeAgent = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', employeeAgent.csrfToken)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .patch(`/employees/${employee.id}/account/profile`)
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
    await administrator
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', 'invalid-token')
      .send(updateEmployeeAccessProfileBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
  });

  it('keeps the last active administrator profile and sessions unchanged', async () => {
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const session = await createSessionForUser(employee.usuario!.id);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    await waitForActiveAdministratorCount(1);

    await session.agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', session.csrfToken)
      .send(updateEmployeeAccessProfileBody({ profile: 'employee' }))
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'LAST_ACTIVE_ADMIN_REQUIRED',
        message: 'At least one active administrator account must remain',
      });

    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      }),
    ).resolves.toEqual(accountBefore);
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        session.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 1 });
    await session.agent.get('/auth/session').expect(HttpStatus.OK);
  });

  it('allows an administrator to demote their own account when another active administrator remains and revokes the current session', async () => {
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    await createEmployeeFixture({ conta: { perfil: 'ADMINISTRADOR' } });
    const session = await createSessionForUser(employee.usuario!.id);
    await waitForActiveAdministratorCount(2);

    const response = await session.agent
      .patch(`/employees/${employee.id}/account/profile`)
      .set('X-CSRF-Token', session.csrfToken)
      .send(updateEmployeeAccessProfileBody({ profile: 'employee' }))
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: { ativo: true, perfil: 'FUNCIONARIO' },
    });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        session.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
    await session.agent.get('/auth/session').expect(HttpStatus.UNAUTHORIZED);
  });

  it('keeps at least one active administrator during concurrent profile demotions', async () => {
    const firstAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const secondAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const firstSession = await createSessionForUser(
      firstAdministrator.usuario!.id,
    );
    const secondSession = await createSessionForUser(
      secondAdministrator.usuario!.id,
    );
    await waitForActiveAdministratorCount(2);

    const responses = await Promise.all([
      firstSession.agent
        .patch(`/employees/${firstAdministrator.id}/account/profile`)
        .set('X-CSRF-Token', firstSession.csrfToken)
        .send(updateEmployeeAccessProfileBody({ profile: 'employee' })),
      secondSession.agent
        .patch(`/employees/${secondAdministrator.id}/account/profile`)
        .set('X-CSRF-Token', secondSession.csrfToken)
        .send(updateEmployeeAccessProfileBody({ profile: 'employee' })),
    ]);
    const [activeAdministrators, employeeProfiles, remainingSessions] =
      await Promise.all([
        database.usuario.count({
          where: { perfil: 'ADMINISTRADOR', ativo: true },
        }),
        database.usuario.findMany({
          where: {
            id: {
              in: [
                firstAdministrator.usuario!.id,
                secondAdministrator.usuario!.id,
              ],
            },
          },
          orderBy: { perfil: 'asc' },
          select: { perfil: true },
        }),
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = ANY($1)',
          [[firstSession.sessionId, secondSession.sessionId]],
        ),
      ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      HttpStatus.OK,
      HttpStatus.CONFLICT,
    ]);
    expect(
      responses.find((response) => response.status === HttpStatus.CONFLICT)
        ?.body,
    ).toMatchObject({ code: 'LAST_ACTIVE_ADMIN_REQUIRED' });
    expect(activeAdministrators).toBe(1);
    expect(employeeProfiles.map(({ perfil }) => perfil).sort()).toEqual([
      'ADMINISTRADOR',
      'FUNCIONARIO',
    ]);
    expect(remainingSessions.rowCount).toBe(1);
  });

  it('suspends only employee access despite active orders and revokes every target session and CSRF context', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const password = 'senha de acesso ativa';
    const senhaHash = await passwordService.hash(password);
    const employee = await createEmployeeFixture({
      conta: {
        emailLogin: `suspensao-${crypto.randomUUID()}@example.test`,
        senhaHash,
        perfil: 'FUNCIONARIO',
        deveAlterarSenha: false,
      },
    });
    const order = await createOrderFixture(
      employee.id,
      StatusOrdemServico.AGUARDANDO,
    );
    const firstTargetSession = await createSessionForUser(employee.usuario!.id);
    const secondTargetSession = await createSessionForUser(
      employee.usuario!.id,
    );
    const otherEmployee = await createEmployeeFixture({ conta: {} });
    const otherSession = await createSessionForUser(otherEmployee.usuario!.id);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });

    const response = await agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.OK);
    const [persistedEmployee, persistedAccount, persistedOrder] =
      await Promise.all([
        database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
        database.usuario.findUniqueOrThrow({
          where: { id: employee.usuario!.id },
        }),
        database.ordemServico.findUniqueOrThrow({ where: { id: order.id } }),
      ]);
    const targetSessions = await verificationPool!.query(
      'SELECT "sid" FROM "session" WHERE "sid" = ANY($1)',
      [[firstTargetSession.sessionId, secondTargetSession.sessionId]],
    );
    const preservedOtherSession = await verificationPool!.query(
      'SELECT "sid" FROM "session" WHERE "sid" = $1',
      [otherSession.sessionId],
    );

    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: {
        emailLogin: accountBefore.emailLogin,
        ativo: false,
        perfil: accountBefore.perfil,
      },
    });
    expect(response.body.conta).not.toHaveProperty('senhaHash');
    expect(response.body.conta).not.toHaveProperty('deveAlterarSenha');
    expect(Object.keys(response.body.conta).sort()).toEqual([
      'ativo',
      'emailLogin',
      'perfil',
    ]);
    expect(persistedEmployee.ativo).toBe(true);
    expect(persistedAccount).toEqual({ ...accountBefore, ativo: false });
    expect(persistedOrder).toEqual(order);
    expect(targetSessions.rowCount).toBe(0);
    expect(preservedOtherSession.rowCount).toBe(1);
    await firstTargetSession.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED);
    await secondTargetSession.agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', secondTargetSession.csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
    await otherSession.agent.get('/auth/session').expect(HttpStatus.OK);

    const loginAgent = request.agent(app);
    const loginCsrfResponse = await loginAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(getSessionId(loginCsrfResponse.headers['set-cookie']?.[0]));
    await loginAgent
      .post('/auth/login')
      .set('X-CSRF-Token', loginCsrfResponse.body.csrfToken as string)
      .send({ email: accountBefore.emailLogin, password })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
  });

  it('repeats inactive safely and removes any remaining target sessions', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      conta: {
        ativo: false,
        emailLogin: `inativa-${crypto.randomUUID()}@example.test`,
        senhaHash: 'hash-inativo-preservado',
        perfil: 'FUNCIONARIO',
        deveAlterarSenha: true,
      },
    });
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    const staleSession = await createSessionForUser(employee.usuario!.id);

    const firstResponse = await agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.OK);
    const secondStaleSession = await createSessionForUser(employee.usuario!.id);
    const secondResponse = await agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.OK);
    const persistedAccount = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });
    const sessions = await verificationPool!.query(
      'SELECT "sid" FROM "session" WHERE "sid" = ANY($1)',
      [[staleSession.sessionId, secondStaleSession.sessionId]],
    );

    expect(firstResponse.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: { ativo: false },
    });
    expect(secondResponse.body).toEqual(firstResponse.body);
    expect(persistedAccount).toEqual(accountBefore);
    expect(sessions.rowCount).toBe(0);
  });

  it.each([true, false])(
    'reactivates access and preserves credentials when mandatory password change is %s',
    async (deveAlterarSenha) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
      const employee = await createEmployeeFixture({
        conta: {
          emailLogin: `reativacao-${deveAlterarSenha}-${crypto.randomUUID()}@example.test`,
          senhaHash: `hash-reativacao-${deveAlterarSenha}`,
          perfil: 'FUNCIONARIO',
          deveAlterarSenha,
        },
      });
      const previousSession = await createSessionForUser(employee.usuario!.id);
      const accountBefore = await database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      });

      await agent
        .patch(`/employees/${employee.id}/account/status`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeAccessStatusBody())
        .expect(HttpStatus.OK);
      const reactivated = await agent
        .patch(`/employees/${employee.id}/account/status`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeAccessStatusBody({ status: 'active' }))
        .expect(HttpStatus.OK);
      const repeatedActive = await agent
        .patch(`/employees/${employee.id}/account/status`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeAccessStatusBody({ status: 'active' }))
        .expect(HttpStatus.OK);
      const accountAfter = await database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      });
      const oldSessions = await verificationPool!.query(
        'SELECT "sid" FROM "session" WHERE "sid" = $1',
        [previousSession.sessionId],
      );

      expect(reactivated.body).toMatchObject({
        id: employee.id,
        ativo: true,
        conta: {
          emailLogin: accountBefore.emailLogin,
          ativo: true,
          perfil: accountBefore.perfil,
        },
      });
      expect(repeatedActive.body).toEqual(reactivated.body);
      expect(accountAfter).toEqual(accountBefore);
      expect(oldSessions.rowCount).toBe(0);
      await previousSession.agent
        .get('/auth/session')
        .expect(HttpStatus.UNAUTHORIZED);
    },
  );

  it('rejects account activation for an inactive employee and keeps access inactive', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      ativo: false,
      conta: { ativo: false },
    });
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: employee.usuario!.id },
    });

    await agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody({ status: 'active' }))
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'EMPLOYEE_MUST_BE_ACTIVE_FOR_ACCOUNT_ACTIVATION',
        message: 'Employee must be active before activating the access account',
      });

    await expect(
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
    ).resolves.toMatchObject({ ativo: false });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      }),
    ).resolves.toEqual(accountBefore);
  });

  it('returns EMPLOYEE_NOT_FOUND when changing access for an unknown employee', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .patch(`/employees/${crypto.randomUUID()}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('returns EMPLOYEE_ACCESS_NOT_FOUND without creating an account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();

    await agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_ACCESS_NOT_FOUND',
        message: 'Employee access account not found',
      });
    await expect(
      database.usuario.findUnique({ where: { funcionarioId: employee.id } }),
    ).resolves.toBeNull();
  });

  it.each([
    ['invalid id', 'not-a-uuid', updateEmployeeAccessStatusBody()],
    [
      'invalid status',
      crypto.randomUUID(),
      updateEmployeeAccessStatusBody({ status: 'pending' }),
    ],
    [
      'unexpected field',
      crypto.randomUUID(),
      updateEmployeeAccessStatusBody({ ativo: false }),
    ],
  ])('rejects access status update with %s', async (_description, id, body) => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .patch(`/employees/${id}/account/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(body)
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body: responseBody }) => {
        expect(responseBody).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('requires session, completed first access, administrator role, and valid CSRF to change access status', async () => {
    const employee = await createEmployeeFixture({ conta: {} });
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', pending.csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employeeAgent = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', employeeAgent.csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .patch(`/employees/${employee.id}/account/status`)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
    await administrator
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', 'invalid-token')
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });
  });

  it('refuses to suspend the last active administrator access', async () => {
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const session = await createSessionForUser(employee.usuario!.id);
    await waitForActiveAdministratorCount(1);

    await session.agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', session.csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'LAST_ACTIVE_ADMIN_REQUIRED',
        message: 'At least one active administrator account must remain',
      });

    await expect(
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
    ).resolves.toMatchObject({ ativo: true });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { id: employee.usuario!.id },
      }),
    ).resolves.toMatchObject({ ativo: true, perfil: 'ADMINISTRADOR' });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        session.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  it('allows self-suspension when another active administrator remains and revokes the current session', async () => {
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    await createEmployeeFixture({ conta: { perfil: 'ADMINISTRADOR' } });
    const session = await createSessionForUser(employee.usuario!.id);
    await waitForActiveAdministratorCount(2);

    const response = await session.agent
      .patch(`/employees/${employee.id}/account/status`)
      .set('X-CSRF-Token', session.csrfToken)
      .send(updateEmployeeAccessStatusBody())
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: { ativo: false, perfil: 'ADMINISTRADOR' },
    });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        session.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
    await session.agent.get('/auth/session').expect(HttpStatus.UNAUTHORIZED);
  });

  it('keeps at least one active administrator during concurrent account suspensions', async () => {
    const firstAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const secondAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const firstSession = await createSessionForUser(
      firstAdministrator.usuario!.id,
    );
    const secondSession = await createSessionForUser(
      secondAdministrator.usuario!.id,
    );
    await waitForActiveAdministratorCount(2);

    const responses = await Promise.all([
      firstSession.agent
        .patch(`/employees/${firstAdministrator.id}/account/status`)
        .set('X-CSRF-Token', firstSession.csrfToken)
        .send(updateEmployeeAccessStatusBody()),
      secondSession.agent
        .patch(`/employees/${secondAdministrator.id}/account/status`)
        .set('X-CSRF-Token', secondSession.csrfToken)
        .send(updateEmployeeAccessStatusBody()),
    ]);
    const [activeAdministrators, activeEmployees] = await Promise.all([
      database.usuario.count({
        where: { perfil: 'ADMINISTRADOR', ativo: true },
      }),
      database.funcionario.count({
        where: {
          id: { in: [firstAdministrator.id, secondAdministrator.id] },
          ativo: true,
        },
      }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      HttpStatus.OK,
      HttpStatus.CONFLICT,
    ]);
    expect(activeAdministrators).toBe(1);
    expect(activeEmployees).toBe(2);
  });

  it('never leaves active access when account reactivation races with employee deactivation', async () => {
    const employee = await createEmployeeFixture({
      ativo: true,
      conta: { ativo: false, perfil: 'FUNCIONARIO' },
    });
    const accountAdministrator = await createAuthenticatedAgentWithCsrf();
    const statusAdministrator = await createAuthenticatedAgentWithCsrf();

    const responses = await Promise.all([
      accountAdministrator.agent
        .patch(`/employees/${employee.id}/account/status`)
        .set('X-CSRF-Token', accountAdministrator.csrfToken)
        .send(updateEmployeeAccessStatusBody({ status: 'active' })),
      statusAdministrator.agent
        .patch(`/employees/${employee.id}/status`)
        .set('X-CSRF-Token', statusAdministrator.csrfToken)
        .send(updateEmployeeStatusBody()),
    ]);
    const [persistedEmployee, persistedAccount] = await Promise.all([
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ]);

    expect(
      responses.some((response) => response.status === HttpStatus.OK),
    ).toBe(true);
    expect(
      responses.every((response) =>
        [HttpStatus.OK, HttpStatus.CONFLICT].includes(response.status),
      ),
    ).toBe(true);
    expect(persistedEmployee.ativo).toBe(false);
    expect(persistedAccount.ativo).toBe(false);
  });

  it('allows an administrator to update an active employee without an account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      nome: 'Funcionário Ativo',
      telefone: '11999990000',
      email: 'ativo@example.test',
    });
    const response = await agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.OK);
    const persisted = await database.funcionario.findUniqueOrThrow({
      where: { id: employee.id },
    });

    expect(response.body).toEqual({
      id: employee.id,
      nome: 'Maria da Silva Atualizada',
      telefone: '11988887777',
      email: 'maria.atualizada@example.test',
      ativo: true,
      criadoEm: employee.criadoEm.toISOString(),
      conta: null,
    });
    expect(persisted).toMatchObject({
      id: employee.id,
      nome: 'Maria da Silva Atualizada',
      telefone: '11988887777',
      email: 'maria.atualizada@example.test',
      ativo: true,
      criadoEm: employee.criadoEm,
    });
    await agent
      .get(`/employees/${employee.id}`)
      .expect(HttpStatus.OK)
      .expect(response.body);
    await expect(
      database.usuario.findUnique({ where: { funcionarioId: employee.id } }),
    ).resolves.toBeNull();
  });

  it('updates an inactive employee while preserving its account and relations', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      nome: 'Funcionário Inativo',
      ativo: false,
      conta: {
        emailLogin: 'conta-existente@example.test',
        senhaHash: 'existing-password-hash',
        ativo: false,
        perfil: 'ADMINISTRADOR',
        deveAlterarSenha: true,
      },
    });
    const client = await database.cliente.create({
      data: {
        nome: 'Cliente Relacionado',
        telefone: '11999991111',
        documento: null,
        email: null,
        cep: '01001000',
        logradouro: 'Praça da Sé',
        numero: '1',
        complemento: null,
        bairro: 'Sé',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    });
    clientIds.push(client.id);
    const order = await database.ordemServico.create({
      data: {
        numero: `OS-${crypto.randomUUID()}`,
        descricao: 'Ordem relacionada ao funcionário',
        valor: '100.00',
        clienteId: client.id,
        responsavelId: employee.id,
      },
    });
    orderIds.push(order.id);
    const history = await database.historicoOrdemServico.create({
      data: {
        versao: 1,
        descricao: order.descricao,
        valor: order.valor,
        observacoes: order.observacoes,
        status: order.status,
        visibilidade: order.visibilidade,
        concluidoEm: order.concluidoEm,
        canceladoEm: order.canceladoEm,
        ordemServicoId: order.id,
        responsavelId: employee.id,
        alteradoPorUsuarioId: employee.usuario!.id,
      },
    });
    historyIds.push(history.id);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: employee.id },
    });

    const response = await agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.OK);
    const [persisted, accountAfter, persistedOrder, persistedHistory] =
      await Promise.all([
        database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
        database.usuario.findUniqueOrThrow({
          where: { funcionarioId: employee.id },
        }),
        database.ordemServico.findUniqueOrThrow({ where: { id: order.id } }),
        database.historicoOrdemServico.findUniqueOrThrow({
          where: { id: history.id },
        }),
      ]);

    expect(response.body).toMatchObject({
      id: employee.id,
      nome: 'Maria da Silva Atualizada',
      ativo: false,
      criadoEm: employee.criadoEm.toISOString(),
      conta: {
        emailLogin: accountBefore.emailLogin,
        ativo: accountBefore.ativo,
        perfil: accountBefore.perfil,
      },
    });
    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body.conta).not.toHaveProperty('senhaHash');
    expect(persisted.ativo).toBe(false);
    expect(persisted.criadoEm).toEqual(employee.criadoEm);
    expect(accountAfter).toEqual(accountBefore);
    expect(persistedOrder.responsavelId).toBe(employee.id);
    expect(persistedHistory.responsavelId).toBe(employee.id);
    expect(persistedHistory.alteradoPorUsuarioId).toBe(accountBefore.id);
  });

  it('normalizes update input and allows duplicate employee contacts', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const sharedContact = {
      telefone: '11987654321',
      email: 'Contato.Compartilhado@Example.test',
    };
    await createEmployeeFixture({
      nome: 'Outro Funcionário',
      ...sharedContact,
    });
    const employee = await createEmployeeFixture();

    const response = await agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        updateEmployeeBody({
          nome: '  Maria Normalizada  ',
          telefone: '+55 (11) 98765-4321',
          email: '  Contato.Compartilhado@Example.test  ',
        }),
      )
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      nome: 'Maria Normalizada',
      telefone: sharedContact.telefone,
      email: sharedContact.email,
    });
    await expect(
      database.funcionario.count({ where: sharedContact }),
    ).resolves.toBe(2);
  });

  it.each([
    ['empty name', { nome: '   ' }],
    ['name shorter than two characters', { nome: ' A ' }],
    ['name longer than 120 characters', { nome: 'a'.repeat(121) }],
    ['invalid phone', { telefone: '119999999' }],
    ['empty email', { email: '   ' }],
    ['invalid email', { email: 'email-inválido' }],
  ])('rejects employee update with %s', async (_description, overrides) => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();

    await agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeBody(overrides))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it.each([
    ['status', 'inactive'],
    ['ativo', false],
    ['id', crypto.randomUUID()],
    ['criadoEm', new Date().toISOString()],
    ['conta', { emailLogin: 'indevido@example.test' }],
    ['usuario', { emailLogin: 'indevido@example.test' }],
    ['emailLogin', 'indevido@example.test'],
    ['perfil', 'ADMINISTRADOR'],
    ['senha', 'indevida'],
    ['senhaHash', 'indevido'],
    ['deveAlterarSenha', false],
    ['campoInesperado', 'valor'],
  ])('rejects employee update field %s', async (field, value) => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();

    await agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ ...updateEmployeeBody(), [field]: value })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('rejects an invalid employee id when updating', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .put('/employees/not-a-uuid')
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('returns EMPLOYEE_NOT_FOUND for an unknown valid employee id when updating', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .put(`/employees/${crypto.randomUUID()}`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

  it('requires session, completed first access, administrator role, and CSRF to update', async () => {
    const employee = await createEmployeeFixture();
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(updateEmployeeBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', pending.csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employeeAgent = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', employeeAgent.csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .put(`/employees/${employee.id}`)
      .send(updateEmployeeBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });

    const authorized = await createAuthenticatedAgentWithCsrf();
    await authorized.agent
      .put(`/employees/${employee.id}`)
      .set('X-CSRF-Token', authorized.csrfToken)
      .send(updateEmployeeBody())
      .expect(HttpStatus.OK);
  });

  it('allows an administrator to change and repeat the status of an employee without an account', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({ ativo: true });

    const deactivated = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.OK);
    const repeatedInactive = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.OK);
    const reactivated = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody({ status: 'active' }))
      .expect(HttpStatus.OK);
    const repeatedActive = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody({ status: 'active' }))
      .expect(HttpStatus.OK);

    expect(deactivated.body).toMatchObject({ ativo: false, conta: null });
    expect(repeatedInactive.body).toMatchObject({ ativo: false, conta: null });
    expect(reactivated.body).toMatchObject({ ativo: true, conta: null });
    expect(repeatedActive.body).toMatchObject({ ativo: true, conta: null });
    await agent
      .get(`/employees/${employee.id}`)
      .expect(HttpStatus.OK)
      .expect(repeatedActive.body);
    await expect(
      database.usuario.findUnique({ where: { funcionarioId: employee.id } }),
    ).resolves.toBeNull();
  });

  it.each([
    ['Aguardando', StatusOrdemServico.AGUARDANDO, HttpStatus.CONFLICT],
    ['Em andamento', StatusOrdemServico.EM_ANDAMENTO, HttpStatus.CONFLICT],
    ['Concluído', StatusOrdemServico.CONCLUIDO, HttpStatus.OK],
    ['Cancelado', StatusOrdemServico.CANCELADO, HttpStatus.OK],
  ])(
    'handles a %s service order when deactivating an employee',
    async (_description, status, expectedStatus) => {
      const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
      const employee = await createEmployeeFixture({
        conta: { perfil: 'FUNCIONARIO' },
      });
      const order = await createOrderFixture(employee.id, status);

      const response = await agent
        .patch(`/employees/${employee.id}/status`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateEmployeeStatusBody())
        .expect(expectedStatus);
      const [persistedEmployee, persistedAccount, persistedOrder] =
        await Promise.all([
          database.funcionario.findUniqueOrThrow({
            where: { id: employee.id },
          }),
          database.usuario.findUniqueOrThrow({
            where: { funcionarioId: employee.id },
          }),
          database.ordemServico.findUniqueOrThrow({ where: { id: order.id } }),
        ]);

      if (expectedStatus === HttpStatus.CONFLICT) {
        expect(response.body).toEqual({
          statusCode: HttpStatus.CONFLICT,
          code: 'EMPLOYEE_HAS_ACTIVE_ORDERS',
          message:
            'Employee has active service orders that must be completed, canceled, or transferred before deactivation',
        });
        expect(persistedEmployee.ativo).toBe(true);
        expect(persistedAccount.ativo).toBe(true);
      } else {
        expect(response.body).toMatchObject({
          id: employee.id,
          ativo: false,
          conta: { ativo: false },
        });
        expect(persistedEmployee.ativo).toBe(false);
        expect(persistedAccount.ativo).toBe(false);
      }

      expect(persistedOrder).toEqual(order);
    },
  );

  it('deactivates an employee account, revokes its sessions, and keeps it inactive after reactivation', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      conta: {
        emailLogin: 'funcionario-status@example.test',
        senhaHash: 'employee-status-hash',
        perfil: 'FUNCIONARIO',
        deveAlterarSenha: true,
      },
    });
    const targetFirstSession = await createSessionForUser(employee.usuario!.id);
    const targetSecondSession = await createSessionForUser(
      employee.usuario!.id,
    );
    const otherEmployee = await createEmployeeFixture({
      conta: { perfil: 'FUNCIONARIO' },
    });
    const otherSession = await createSessionForUser(otherEmployee.usuario!.id);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { funcionarioId: employee.id },
    });

    const deactivated = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.OK);
    const [persistedAccount, targetSessions, otherSessions] = await Promise.all(
      [
        database.usuario.findUniqueOrThrow({
          where: { funcionarioId: employee.id },
        }),
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = ANY($1)',
          [[targetFirstSession.sessionId, targetSecondSession.sessionId]],
        ),
        verificationPool!.query(
          'SELECT "sid" FROM "session" WHERE "sid" = $1',
          [otherSession.sessionId],
        ),
      ],
    );

    expect(deactivated.body).toMatchObject({
      id: employee.id,
      ativo: false,
      conta: {
        emailLogin: accountBefore.emailLogin,
        ativo: false,
        perfil: accountBefore.perfil,
      },
    });
    expect(persistedAccount).toMatchObject({
      ...accountBefore,
      ativo: false,
    });
    expect(targetSessions.rowCount).toBe(0);
    expect(otherSessions.rowCount).toBe(1);

    const reactivated = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody({ status: 'active' }))
      .expect(HttpStatus.OK);

    expect(reactivated.body).toMatchObject({
      id: employee.id,
      ativo: true,
      conta: { ativo: false },
    });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ).resolves.toMatchObject({
      ...accountBefore,
      ativo: false,
    });
  });

  it('deactivates an administrator account when another active administrator remains', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const targetSession = await createSessionForUser(employee.usuario!.id);

    const response = await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      id: employee.id,
      ativo: false,
      conta: { ativo: false, perfil: 'ADMINISTRADOR' },
    });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ).resolves.toMatchObject({ ativo: false, perfil: 'ADMINISTRADOR' });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        targetSession.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  it('keeps the last active administrator, employee, and session unchanged', async () => {
    const employee = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const session = await createSessionForUser(employee.usuario!.id);
    await waitForActiveAdministratorCount(1);

    await session.agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', session.csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'LAST_ACTIVE_ADMIN_REQUIRED',
        message: 'At least one active administrator account must remain',
      });

    await expect(
      database.funcionario.findUniqueOrThrow({ where: { id: employee.id } }),
    ).resolves.toMatchObject({ ativo: true });
    await expect(
      database.usuario.findUniqueOrThrow({
        where: { funcionarioId: employee.id },
      }),
    ).resolves.toMatchObject({ ativo: true, perfil: 'ADMINISTRADOR' });
    await expect(
      verificationPool!.query('SELECT "sid" FROM "session" WHERE "sid" = $1', [
        session.sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  it('keeps at least one active administrator during concurrent deactivations', async () => {
    const firstAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const secondAdministrator = await createEmployeeFixture({
      conta: { perfil: 'ADMINISTRADOR' },
    });
    const firstSession = await createSessionForUser(
      firstAdministrator.usuario!.id,
    );
    const secondSession = await createSessionForUser(
      secondAdministrator.usuario!.id,
    );
    await waitForActiveAdministratorCount(2);

    const responses = await Promise.all([
      firstSession.agent
        .patch(`/employees/${firstAdministrator.id}/status`)
        .set('X-CSRF-Token', firstSession.csrfToken)
        .send(updateEmployeeStatusBody()),
      secondSession.agent
        .patch(`/employees/${secondAdministrator.id}/status`)
        .set('X-CSRF-Token', secondSession.csrfToken)
        .send(updateEmployeeStatusBody()),
    ]);
    const activeAdministrators = await database.usuario.count({
      where: { perfil: 'ADMINISTRADOR', ativo: true },
    });

    expect(responses.map((response) => response.status).sort()).toEqual([
      HttpStatus.OK,
      HttpStatus.CONFLICT,
    ]);
    expect(activeAdministrators).toBeGreaterThanOrEqual(1);
  });

  it('requires session, completed first access, administrator role, and CSRF to update status', async () => {
    const employee = await createEmployeeFixture();
    const unauthenticatedAgent = request.agent(app);
    const unauthenticatedCsrf = await unauthenticatedAgent
      .get('/auth/csrf')
      .expect(HttpStatus.OK);
    sessionIds.push(
      getSessionId(unauthenticatedCsrf.headers['set-cookie']?.[0]),
    );

    await unauthenticatedAgent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', unauthenticatedCsrf.body.csrfToken as string)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });

    const pending = await createAuthenticatedAgentWithCsrf({
      deveAlterarSenha: true,
    });
    await pending.agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', pending.csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        message: 'Password change is required before accessing the application',
      });

    const employeeAgent = await createAuthenticatedAgentWithCsrf({
      perfil: 'FUNCIONARIO',
    });
    await employeeAgent.agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', employeeAgent.csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'AUTH_FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });

    const administrator = await createAuthenticatedAgent();
    await administrator
      .patch(`/employees/${employee.id}/status`)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect({
        statusCode: HttpStatus.FORBIDDEN,
        code: 'CSRF_INVALID_TOKEN',
        message: 'CSRF token is invalid',
      });

    const authorized = await createAuthenticatedAgentWithCsrf();
    await authorized.agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', authorized.csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.OK);
  });

  it.each([
    ['invalid status', { status: 'pending' }],
    ['ativo', { status: 'inactive', ativo: false }],
    ['conta', { status: 'inactive', conta: {} }],
    ['usuario', { status: 'inactive', usuario: {} }],
    ['perfil', { status: 'inactive', perfil: 'ADMINISTRADOR' }],
    ['emailLogin', { status: 'inactive', emailLogin: 'indevido@example.test' }],
    ['senhaHash', { status: 'inactive', senhaHash: 'indevido' }],
    ['registration field', { status: 'inactive', nome: 'Indevido' }],
    ['unexpected field', { status: 'inactive', campoInesperado: true }],
  ])('rejects employee status update with %s', async (_description, body) => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();
    const employee = await createEmployeeFixture();

    await agent
      .patch(`/employees/${employee.id}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(body)
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body: responseBody }) => {
        expect(responseBody).toMatchObject({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
  });

  it('rejects an invalid employee id when updating status', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .patch('/employees/not-a-uuid/status')
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('returns EMPLOYEE_NOT_FOUND for an unknown valid employee id when updating status', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgentWithCsrf();

    await agent
      .patch(`/employees/${crypto.randomUUID()}/status`)
      .set('X-CSRF-Token', csrfToken)
      .send(updateEmployeeStatusBody())
      .expect(HttpStatus.NOT_FOUND)
      .expect({
        statusCode: HttpStatus.NOT_FOUND,
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'Employee not found',
      });
  });

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
    await request(app)
      .get('/employees')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
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

  it('documents employee creation, account management, registration and status updates, reads, and nullable account DTOs in OpenAPI', async () => {
    const response = await request(app)
      .get('/api/docs/openapi.json')
      .expect(HttpStatus.OK);
    const listOperation = response.body.paths['/employees'].get;
    const createOperation = response.body.paths['/employees'].post;
    const createAccountOperation =
      response.body.paths['/employees/{id}/account'].post;
    const accountStatusUpdateOperation =
      response.body.paths['/employees/{id}/account/status'].patch;
    const accountProfileUpdateOperation =
      response.body.paths['/employees/{id}/account/profile'].patch;
    const detailOperation = response.body.paths['/employees/{id}'].get;
    const updateOperation = response.body.paths['/employees/{id}'].put;
    const statusUpdateOperation =
      response.body.paths['/employees/{id}/status'].patch;

    expect(Object.keys(response.body.paths['/employees']).sort()).toEqual([
      'get',
      'post',
    ]);
    expect(Object.keys(response.body.paths['/employees/{id}']).sort()).toEqual([
      'get',
      'put',
    ]);
    expect(Object.keys(response.body.paths['/employees/{id}/account'])).toEqual(
      ['post'],
    );
    expect(
      Object.keys(response.body.paths['/employees/{id}/account/status']),
    ).toEqual(['patch']);
    expect(
      Object.keys(response.body.paths['/employees/{id}/account/profile']),
    ).toEqual(['patch']);
    expect(createOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      createOperation.requestBody.content['application/json'].schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'telefone', 'email', 'status'],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
        email: {
          type: 'string',
          format: 'email',
          example: 'maria@example.com',
        },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    });
    for (const status of ['201', '400', '401', '403']) {
      expect(createOperation.responses).toHaveProperty(status);
    }
    expect(createOperation.responses['201'].description).toContain(
      'conta: null',
    );
    expect(createAccountOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      createAccountOperation.requestBody.content['application/json'].schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['loginEmail', 'profile', 'initialPassword', 'confirmPassword'],
      properties: {
        loginEmail: {
          type: 'string',
          format: 'email',
          example: 'maria@login.example.com',
        },
        profile: {
          type: 'string',
          enum: ['administrator', 'employee'],
        },
        initialPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          format: 'password',
        },
        confirmPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          format: 'password',
        },
      },
    });
    for (const status of ['201', '400', '401', '403', '404', '409']) {
      expect(createAccountOperation.responses).toHaveProperty(status);
    }
    expect(createAccountOperation.responses['409'].description).toContain(
      'EMPLOYEE_ACCESS_ALREADY_EXISTS',
    );
    expect(createAccountOperation.responses['409'].description).toContain(
      'LOGIN_EMAIL_ALREADY_EXISTS',
    );
    expect(createAccountOperation.responses['201'].description).toContain(
      'mesma situação do Funcionário',
    );
    expect(accountStatusUpdateOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      accountStatusUpdateOperation.requestBody.content['application/json']
        .schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    });
    for (const status of ['200', '400', '401', '403', '404', '409']) {
      expect(accountStatusUpdateOperation.responses).toHaveProperty(status);
    }
    expect(accountStatusUpdateOperation.responses['404'].description).toContain(
      'EMPLOYEE_ACCESS_NOT_FOUND',
    );
    expect(accountStatusUpdateOperation.responses['409'].description).toContain(
      'EMPLOYEE_MUST_BE_ACTIVE_FOR_ACCOUNT_ACTIVATION',
    );
    expect(accountStatusUpdateOperation.responses['409'].description).toContain(
      'LAST_ACTIVE_ADMIN_REQUIRED',
    );
    expect(accountProfileUpdateOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      accountProfileUpdateOperation.requestBody.content['application/json']
        .schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['profile'],
      properties: {
        profile: {
          type: 'string',
          enum: ['administrator', 'employee'],
        },
      },
    });
    for (const status of ['200', '400', '401', '403', '404', '409']) {
      expect(accountProfileUpdateOperation.responses).toHaveProperty(status);
    }
    expect(
      accountProfileUpdateOperation.responses['404'].description,
    ).toContain('EMPLOYEE_NOT_FOUND');
    expect(
      accountProfileUpdateOperation.responses['404'].description,
    ).toContain('EMPLOYEE_ACCESS_NOT_FOUND');
    expect(
      accountProfileUpdateOperation.responses['409'].description,
    ).toContain('LAST_ACTIVE_ADMIN_REQUIRED');
    expect(updateOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      updateOperation.requestBody.content['application/json'].schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'telefone', 'email'],
      properties: {
        nome: { type: 'string', minLength: 2, maxLength: 120 },
        telefone: { type: 'string', example: '+55 (11) 99999-9999' },
        email: {
          type: 'string',
          format: 'email',
          example: 'maria@example.com',
        },
      },
    });
    for (const status of ['200', '400', '401', '403', '404']) {
      expect(updateOperation.responses).toHaveProperty(status);
    }
    expect(statusUpdateOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
        expect.objectContaining({ name: 'X-CSRF-Token', in: 'header' }),
      ]),
    );
    expect(
      statusUpdateOperation.requestBody.content['application/json'].schema,
    ).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    });
    for (const status of ['200', '400', '401', '403', '404', '409']) {
      expect(statusUpdateOperation.responses).toHaveProperty(status);
    }
    expect(statusUpdateOperation.responses['409'].description).toContain(
      'EMPLOYEE_HAS_ACTIVE_ORDERS',
    );
    expect(statusUpdateOperation.responses['409'].description).toContain(
      'LAST_ACTIVE_ADMIN_REQUIRED',
    );
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
    ).toMatchObject({
      nullable: true,
      description: expect.stringContaining('cadastro inicial'),
    });
  });
});
