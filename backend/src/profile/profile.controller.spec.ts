import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { SessionStoreService } from '../auth/session/session-store.service.js';
import { PasswordService } from '../auth/password/password.service.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { DatabaseService } from '../database/database.service.js';
import { PRINCIPAL_ENVIRONMENT_ID } from '../environments/principal-environment.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run profile tests.');
}

type ProfileFixture = {
  employeeId: string;
  userId: string;
  emailLogin: string;
  password: string;
  perfil: 'ADMINISTRADOR' | 'FUNCIONARIO';
};

function getSessionId(cookie: string | undefined): string {
  if (!cookie) {
    throw new Error('Expected a session cookie.');
  }

  const cookieValue = cookie.split(';', 1)[0]?.replace('connect.sid=', '');
  const signedSessionId = decodeURIComponent(cookieValue ?? '');
  const sessionId = signedSessionId.slice(2).split('.', 1)[0];

  if (!signedSessionId.startsWith('s:') || !sessionId) {
    throw new Error('Expected a signed session identifier.');
  }

  return sessionId;
}

describe('ProfileController', () => {
  let app: Express;
  let database: DatabaseService;
  let nestApplication: INestApplication;
  let passwordService: PasswordService;
  let testingModule: TestingModule;
  let verificationPool: Pool;
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
    await nestApplication.init();

    app = nestApplication.getHttpAdapter().getInstance() as Express;
    database = nestApplication.get(DatabaseService);
    passwordService = nestApplication.get(PasswordService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    if (sessionIds.length > 0) {
      await verificationPool.query(
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
    await verificationPool.end();
    await nestApplication.close();
  });

  async function createProfileFixture({
    deveAlterarSenha = false,
    password = 'senha atual segura',
    perfil = 'FUNCIONARIO',
  }: Partial<{
    deveAlterarSenha: boolean;
    password: string;
    perfil: ProfileFixture['perfil'];
  }> = {}): Promise<ProfileFixture> {
    const suffix = crypto.randomUUID();
    const employee = await database.funcionario.create({
      data: {
        environmentId: PRINCIPAL_ENVIRONMENT_ID,
        nome: `Pessoa ${suffix}`,
        telefone: '11999999999',
        email: `contato-${suffix}@example.test`,
      },
    });
    const emailLogin = `login-${suffix}@example.test`;
    const user = await database.usuario.create({
      data: {
        environmentId: PRINCIPAL_ENVIRONMENT_ID,
        emailLogin,
        senhaHash: await passwordService.hash(password),
        perfil,
        deveAlterarSenha,
        funcionarioId: employee.id,
      },
    });

    employeeIds.push(employee.id);
    userIds.push(user.id);

    return {
      employeeId: employee.id,
      userId: user.id,
      emailLogin,
      password,
      perfil,
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
    const update = await verificationPool.query(
      'UPDATE "session" SET "sess" = jsonb_set("sess"::jsonb, \'{usuarioId}\', to_jsonb($2::text))::json WHERE "sid" = $1',
      [sessionId, usuarioId],
    );

    sessionIds.push(sessionId);
    expect(update.rowCount).toBe(1);

    return {
      agent,
      csrfToken: response.body.csrfToken as string,
      sessionId,
    };
  }

  async function authenticateFixture(fixture: ProfileFixture) {
    return createSessionForUser(fixture.userId);
  }

  async function login(email: string, password: string) {
    const agent = request.agent(app);
    const csrfResponse = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    sessionIds.push(getSessionId(csrfResponse.headers['set-cookie']?.[0]));
    const response = await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfResponse.body.csrfToken as string)
      .send({ email, password });
    const authenticatedCookie = response.headers['set-cookie']?.[0];

    if (authenticatedCookie) {
      sessionIds.push(getSessionId(authenticatedCookie));
    }

    return response;
  }

  function profileUpdateBody(overrides: Record<string, unknown> = {}) {
    return {
      nome: 'Nome atualizado',
      telefone: '+55 (11) 98888-7777',
      ...overrides,
    };
  }

  function passwordUpdateBody(overrides: Record<string, unknown> = {}) {
    return {
      currentPassword: 'senha atual segura',
      newPassword: 'senha nova segura',
      newPasswordConfirmation: 'senha nova segura',
      ...overrides,
    };
  }

  it('allows an authenticated employee to read only their own profile', async () => {
    const fixture = await createProfileFixture();
    const otherFixture = await createProfileFixture();
    const { agent } = await authenticateFixture(fixture);
    const employee = await database.funcionario.findUniqueOrThrow({
      where: { id: fixture.employeeId },
    });
    const response = await agent
      .get(`/profile?employeeId=${otherFixture.employeeId}`)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      nome: employee.nome,
      telefone: employee.telefone,
      email: employee.email,
      perfil: 'FUNCIONARIO',
      funcionarioAtivo: true,
      contaAtiva: true,
    });
    expect(Object.keys(response.body).sort()).toEqual([
      'contaAtiva',
      'email',
      'funcionarioAtivo',
      'nome',
      'perfil',
      'telefone',
    ]);
    expect(response.body).not.toHaveProperty('id');
    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body).not.toHaveProperty('sessionId');
    await agent
      .get(`/profile/${otherFixture.employeeId}`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('allows an authenticated administrator to read their own profile', async () => {
    const fixture = await createProfileFixture({ perfil: 'ADMINISTRADOR' });
    const { agent } = await authenticateFixture(fixture);

    await agent
      .get('/profile')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({ perfil: 'ADMINISTRADOR' });
      });
  });

  it('requires an authenticated session to read a profile', async () => {
    await request(app).get('/profile').expect(HttpStatus.UNAUTHORIZED).expect({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'AUTH_UNAUTHENTICATED',
      message: 'Authentication required',
    });
  });

  it('keeps a pending first access blocked from the profile', async () => {
    const fixture = await createProfileFixture({ deveAlterarSenha: true });
    const { agent } = await authenticateFixture(fixture);

    await agent.get('/profile').expect(HttpStatus.FORBIDDEN).expect({
      statusCode: HttpStatus.FORBIDDEN,
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing the application',
    });
  });

  it('updates an employee name and phone and reflects the name in the next session response', async () => {
    const fixture = await createProfileFixture();
    const otherFixture = await createProfileFixture();
    const otherEmployeeBefore = await database.funcionario.findUniqueOrThrow({
      where: { id: otherFixture.employeeId },
    });
    const { agent, csrfToken } = await authenticateFixture(fixture);
    const response = await agent
      .put('/profile')
      .set('X-CSRF-Token', csrfToken)
      .send(profileUpdateBody())
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      nome: 'Nome atualizado',
      telefone: '11988887777',
      perfil: 'FUNCIONARIO',
    });
    await expect(
      database.funcionario.findUniqueOrThrow({
        where: { id: fixture.employeeId },
      }),
    ).resolves.toMatchObject({
      nome: 'Nome atualizado',
      telefone: '11988887777',
    });
    await expect(
      database.funcionario.findUniqueOrThrow({
        where: { id: otherFixture.employeeId },
      }),
    ).resolves.toEqual(otherEmployeeBefore);
    await agent
      .get('/auth/session')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body.funcionarioNome).toBe('Nome atualizado');
      });
  });

  it('allows an administrator to update their own name and phone', async () => {
    const fixture = await createProfileFixture({ perfil: 'ADMINISTRADOR' });
    const { agent, csrfToken } = await authenticateFixture(fixture);

    await agent
      .put('/profile')
      .set('X-CSRF-Token', csrfToken)
      .send(profileUpdateBody({ nome: 'Administradora Atualizada' }))
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nome: 'Administradora Atualizada',
          telefone: '11988887777',
          perfil: 'ADMINISTRADOR',
        });
      });
  });

  it.each([
    ['profile', { perfil: 'ADMINISTRADOR' }],
    ['employee status', { funcionarioAtivo: false }],
    ['account status', { contaAtiva: false }],
    ['login email', { emailLogin: 'outro-login@example.test' }],
    ['contact email', { email: 'outro-contato@example.test' }],
    ['employee id', { employeeId: crypto.randomUUID() }],
    ['user id', { userId: crypto.randomUUID() }],
    ['unknown field', { unexpected: true }],
  ])('rejects an attempt to update %s', async (_field, extraField) => {
    const fixture = await createProfileFixture();
    const employeeBefore = await database.funcionario.findUniqueOrThrow({
      where: { id: fixture.employeeId },
    });
    const { agent, csrfToken } = await authenticateFixture(fixture);

    await agent
      .put('/profile')
      .set('X-CSRF-Token', csrfToken)
      .send(profileUpdateBody(extraField))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
    await expect(
      database.funcionario.findUniqueOrThrow({
        where: { id: fixture.employeeId },
      }),
    ).resolves.toEqual(employeeBefore);
  });

  it('requires a valid CSRF token to update the profile', async () => {
    const fixture = await createProfileFixture();
    const { agent } = await authenticateFixture(fixture);

    await agent
      .put('/profile')
      .send(profileUpdateBody())
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => {
        expect(body.code).toBe('CSRF_INVALID_TOKEN');
      });
  });

  it('changes the password, preserves first-access state, and revokes every account session', async () => {
    const fixture = await createProfileFixture();
    const primarySession = await authenticateFixture(fixture);
    const secondarySession = await createSessionForUser(fixture.userId);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: fixture.userId },
    });

    await primarySession.agent
      .put('/profile/password')
      .set('X-CSRF-Token', primarySession.csrfToken)
      .send(passwordUpdateBody())
      .expect(HttpStatus.NO_CONTENT)
      .expect('');

    const accountAfter = await database.usuario.findUniqueOrThrow({
      where: { id: fixture.userId },
    });
    const sessionsAfter = await verificationPool.query(
      'SELECT "sid" FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
      [fixture.userId],
    );

    expect(accountAfter.senhaHash).not.toBe(accountBefore.senhaHash);
    expect(accountAfter.deveAlterarSenha).toBe(false);
    await expect(
      passwordService.verify(accountAfter.senhaHash, fixture.password),
    ).resolves.toBe(false);
    await expect(
      passwordService.verify(accountAfter.senhaHash, 'senha nova segura'),
    ).resolves.toBe(true);
    expect(sessionsAfter.rowCount).toBe(0);
    await primarySession.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED);
    await secondarySession.agent
      .get('/auth/session')
      .expect(HttpStatus.UNAUTHORIZED);
    await expect(
      login(fixture.emailLogin, fixture.password),
    ).resolves.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
    const newLogin = await login(fixture.emailLogin, 'senha nova segura');

    expect(newLogin.status).toBe(HttpStatus.OK);
    expect(newLogin.body).toMatchObject({
      id: fixture.userId,
      deveAlterarSenha: false,
    });
  });

  it('rejects an incorrect current password with a semantic error and preserves the session', async () => {
    const fixture = await createProfileFixture();
    const { agent, csrfToken } = await authenticateFixture(fixture);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: fixture.userId },
    });

    await agent
      .put('/profile/password')
      .set('X-CSRF-Token', csrfToken)
      .send(passwordUpdateBody({ currentPassword: 'senha incorreta' }))
      .expect(HttpStatus.BAD_REQUEST)
      .expect({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'PROFILE_CURRENT_PASSWORD_INCORRECT',
        message: 'Current password is incorrect',
      });
    await expect(
      database.usuario.findUniqueOrThrow({ where: { id: fixture.userId } }),
    ).resolves.toEqual(accountBefore);
    await agent.get('/auth/session').expect(HttpStatus.OK);
  });

  it.each([
    [
      'a different confirmation',
      { newPasswordConfirmation: 'senha nova diferente' },
    ],
    [
      'a password outside the security policy',
      { newPassword: 'curta', newPasswordConfirmation: 'curta' },
    ],
    ['an unexpected field', { deveAlterarSenha: true }],
  ])('rejects a password change with %s', async (_reason, overrides) => {
    const fixture = await createProfileFixture();
    const { agent, csrfToken } = await authenticateFixture(fixture);
    const accountBefore = await database.usuario.findUniqueOrThrow({
      where: { id: fixture.userId },
    });

    await agent
      .put('/profile/password')
      .set('X-CSRF-Token', csrfToken)
      .send(passwordUpdateBody(overrides))
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        });
      });
    await expect(
      database.usuario.findUniqueOrThrow({ where: { id: fixture.userId } }),
    ).resolves.toEqual(accountBefore);
  });

  it('keeps administrative employee endpoints forbidden to an employee, including their own id', async () => {
    const fixture = await createProfileFixture();
    const { agent, csrfToken } = await authenticateFixture(fixture);

    await agent.get('/employees').expect(HttpStatus.FORBIDDEN);
    await agent
      .get(`/employees/${fixture.employeeId}`)
      .expect(HttpStatus.FORBIDDEN);
    await agent
      .put(`/employees/${fixture.employeeId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        nome: 'Tentativa administrativa',
        telefone: '11911112222',
        email: 'tentativa@example.test',
      })
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_FORBIDDEN');
      });
  });
});
