import 'dotenv/config';
import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/errors/http-exception.filter.js';
import { createCorsOptions } from '../common/http/cors.options.js';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password/password.service.js';
import { SessionStoreService } from './session/session-store.service.js';

declare module 'express-session' {
  interface SessionData {
    authFixtureId?: string;
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run authentication tests.');
}

const invalidCredentialsResponse = {
  statusCode: HttpStatus.UNAUTHORIZED,
  code: 'AUTH_INVALID_CREDENTIALS',
  message: 'Invalid email or password',
};

const csrfInvalidTokenResponse = {
  statusCode: HttpStatus.FORBIDDEN,
  code: 'CSRF_INVALID_TOKEN',
  message: 'CSRF token is invalid',
};

const frontendOrigin = 'http://localhost:5173';

type UserFixture = {
  userId: string;
  funcionarioId: string;
  email: string;
  password: string;
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

  if (!signedSessionId.startsWith('s:')) {
    throw new Error('Expected a signed session cookie.');
  }

  const sessionId = signedSessionId.slice(2).split('.', 1)[0];

  if (!sessionId) {
    throw new Error('Expected a session identifier.');
  }

  return sessionId;
}

describe('AuthController', () => {
  let app: Express;
  let database: DatabaseService;
  let passwordService: PasswordService;
  let testingModule: TestingModule;
  let nestApplication: INestApplication;
  let verificationPool: Pool;
  const fixtures: UserFixture[] = [];
  const csrfSessionIds: string[] = [];

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    nestApplication = testingModule.createNestApplication();
    const sessionStoreService = nestApplication.get(SessionStoreService);

    nestApplication.use(sessionStoreService.middleware);
    nestApplication.useGlobalFilters(new HttpExceptionFilter());
    nestApplication.enableCors(createCorsOptions(frontendOrigin));
    app = nestApplication.getHttpAdapter().getInstance() as Express;
    app.get(
      '/auth-test-session',
      (sessionRequest: Request, response: Response) => {
        sessionRequest.session.authFixtureId = crypto.randomUUID();
        response.status(HttpStatus.NO_CONTENT).send();
      },
    );
    await nestApplication.init();

    database = nestApplication.get(DatabaseService);
    passwordService = nestApplication.get(PasswordService);
    verificationPool = new Pool({ connectionString: databaseUrl });
  });

  afterEach(async () => {
    const userIds = fixtures.map(({ userId }) => userId);
    const funcionarioIds = fixtures.map(({ funcionarioId }) => funcionarioId);

    if (userIds.length > 0) {
      await verificationPool.query(
        'DELETE FROM "session" WHERE "sess" ->> \'usuarioId\' = ANY($1::text[])',
        [userIds],
      );
      await database.usuario.deleteMany({ where: { id: { in: userIds } } });
      await database.funcionario.deleteMany({
        where: { id: { in: funcionarioIds } },
      });
    }

    if (csrfSessionIds.length > 0) {
      await verificationPool.query(
        'DELETE FROM "session" WHERE "sid" = ANY($1)',
        [csrfSessionIds],
      );
    }

    fixtures.length = 0;
    csrfSessionIds.length = 0;
  });

  afterAll(async () => {
    await verificationPool.end();
    await nestApplication.close();
  });

  async function createUserFixture({
    ativo = true,
    deveAlterarSenha = false,
    password = 'senha-de-teste-segura',
  }: Partial<{
    ativo: boolean;
    deveAlterarSenha: boolean;
    password: string;
  }> = {}): Promise<UserFixture> {
    const suffix = crypto.randomUUID();
    const funcionario = await database.funcionario.create({
      data: {
        nome: `Funcionário ${suffix}`,
        telefone: '11999999999',
        email: `funcionario-${suffix}@example.test`,
      },
    });
    const email = `usuario-${suffix}@example.test`;
    const usuario = await database.usuario.create({
      data: {
        emailLogin: email,
        senhaHash: await passwordService.hash(password),
        perfil: 'FUNCIONARIO',
        ativo,
        deveAlterarSenha,
        funcionarioId: funcionario.id,
      },
    });
    const fixture = {
      userId: usuario.id,
      funcionarioId: funcionario.id,
      email,
      password,
    };

    fixtures.push(fixture);

    return fixture;
  }

  async function getCsrfToken(agent: SuperAgentTest): Promise<string> {
    const response = await agent.get('/auth/csrf').expect(HttpStatus.OK);
    const cookie = response.headers['set-cookie']?.[0];

    if (cookie) {
      csrfSessionIds.push(getSessionId(cookie));
    }

    expect(response.body.csrfToken).toEqual(expect.any(String));

    return response.body.csrfToken as string;
  }

  async function createCsrfSession(): Promise<{
    agent: SuperAgentTest;
    csrfToken: string;
  }> {
    const agent = request.agent(app);

    return { agent, csrfToken: await getCsrfToken(agent) };
  }

  async function loginWithCsrf(fixture: UserFixture) {
    const { agent, csrfToken } = await createCsrfSession();
    const response = await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: fixture.email, password: fixture.password })
      .expect(HttpStatus.OK);

    return { agent, csrfToken, response };
  }

  it('creates, persists, and reuses a CSRF token without a dedicated cookie', async () => {
    const agent = request.agent(app);
    const firstResponse = await agent
      .get('/auth/csrf')
      .set('Origin', frontendOrigin)
      .expect(HttpStatus.OK);
    const csrfToken = firstResponse.body.csrfToken as string;
    const cookie = firstResponse.headers['set-cookie']?.[0];
    const sessionId = getSessionId(cookie);
    const persistedSession = await verificationPool.query<{
      sess: Record<string, unknown>;
    }>('SELECT "sess" FROM "session" WHERE "sid" = $1', [sessionId]);
    const secondResponse = await agent.get('/auth/csrf').expect(HttpStatus.OK);

    csrfSessionIds.push(sessionId);
    expect(csrfToken).toEqual(expect.any(String));
    expect(firstResponse.headers['access-control-allow-origin']).toBe(
      frontendOrigin,
    );
    expect(firstResponse.headers['access-control-allow-credentials']).toBe(
      'true',
    );
    expect(firstResponse.headers['access-control-allow-origin']).not.toBe('*');
    expect(cookie).toMatch(/^connect\.sid=/);
    expect(cookie).not.toContain(csrfToken);
    expect(persistedSession.rows[0]?.sess).toMatchObject({ csrfToken });
    expect(secondResponse.body).toEqual({ csrfToken });

    const preflightResponse = await request(app)
      .options('/auth/login')
      .set('Origin', frontendOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, X-CSRF-Token')
      .expect(HttpStatus.NO_CONTENT);

    expect(preflightResponse.headers['access-control-allow-origin']).toBe(
      frontendOrigin,
    );
    expect(preflightResponse.headers['access-control-allow-credentials']).toBe(
      'true',
    );
    expect(
      preflightResponse.headers['access-control-allow-headers']?.toLowerCase(),
    ).toContain('x-csrf-token');
    expect(preflightResponse.headers['access-control-allow-origin']).not.toBe(
      '*',
    );
  });

  it('requires a CSRF token to login', async () => {
    const fixture = await createUserFixture();

    await request(app)
      .post('/auth/login')
      .send({ email: fixture.email, password: fixture.password })
      .expect(HttpStatus.FORBIDDEN)
      .expect(csrfInvalidTokenResponse);
  });

  it('authenticates valid credentials and persists only usuarioId in PostgreSQL', async () => {
    const fixture = await createUserFixture({ deveAlterarSenha: true });
    const { response } = await loginWithCsrf(fixture);
    const cookie = response.headers['set-cookie']?.[0];
    const persistedSession = await verificationPool.query<{
      sid: string;
      sess: Record<string, unknown>;
    }>(
      'SELECT "sid", "sess" FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
      [fixture.userId],
    );

    expect(response.body).toEqual({
      id: fixture.userId,
      perfil: 'FUNCIONARIO',
      funcionarioId: fixture.funcionarioId,
      funcionarioNome: expect.stringContaining('Funcionário'),
      deveAlterarSenha: true,
    });
    expect(cookie?.startsWith('connect.sid=s%3A')).toBe(true);
    expect(persistedSession.rowCount).toBe(1);
    expect(persistedSession.rows[0]?.sess).toMatchObject({
      usuarioId: fixture.userId,
    });
    expect(Object.keys(persistedSession.rows[0]?.sess ?? {}).sort()).toEqual([
      'cookie',
      'usuarioId',
    ]);
    expect(response.body).not.toHaveProperty('senha');
    expect(response.body).not.toHaveProperty('senhaHash');
    expect(response.body).not.toHaveProperty('sessionId');
    expect(response.body).not.toHaveProperty('session');
    expect(JSON.stringify(response.body)).not.toContain(fixture.password);
    expect(JSON.stringify(response.body)).not.toContain(
      persistedSession.rows[0]?.sid,
    );
  });

  it('returns the same public response for invalid password, unknown email, and inactive account', async () => {
    const activeFixture = await createUserFixture();
    const inactiveFixture = await createUserFixture({ ativo: false });
    const [wrongPasswordSession, unknownEmailSession, inactiveSession] =
      await Promise.all([
        createCsrfSession(),
        createCsrfSession(),
        createCsrfSession(),
      ]);
    const responses = await Promise.all([
      wrongPasswordSession.agent
        .post('/auth/login')
        .set('X-CSRF-Token', wrongPasswordSession.csrfToken)
        .send({ email: activeFixture.email, password: 'senha-incorreta' }),
      unknownEmailSession.agent
        .post('/auth/login')
        .set('X-CSRF-Token', unknownEmailSession.csrfToken)
        .send({
          email: 'inexistente@example.test',
          password: activeFixture.password,
        }),
      inactiveSession.agent
        .post('/auth/login')
        .set('X-CSRF-Token', inactiveSession.csrfToken)
        .send({
          email: inactiveFixture.email,
          password: inactiveFixture.password,
        }),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual(invalidCredentialsResponse);
    }
  });

  it('normalizes only the email and keeps the password exact', async () => {
    const fixture = await createUserFixture({ password: ' senha exata ' });
    const { agent, csrfToken } = await createCsrfSession();

    await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: `  ${fixture.email.toUpperCase()}  `,
        password: fixture.password.trim(),
      })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(invalidCredentialsResponse);

    const response = await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: `  ${fixture.email.toUpperCase()}  `,
        password: fixture.password,
      })
      .expect(HttpStatus.OK);

    expect(response.body.id).toBe(fixture.userId);
  });

  it('regenerates the session identifier before storing usuarioId', async () => {
    const fixture = await createUserFixture();
    const agent = request.agent(app);
    const initialResponse = await agent
      .get('/auth-test-session')
      .expect(HttpStatus.NO_CONTENT);
    const initialCookie = initialResponse.headers['set-cookie']?.[0];
    const csrfToken = await getCsrfToken(agent);
    const loginResponse = await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: fixture.email, password: fixture.password })
      .expect(HttpStatus.OK);
    const authenticatedCookie = loginResponse.headers['set-cookie']?.[0];

    expect(initialCookie).toBeDefined();
    expect(authenticatedCookie).toBeDefined();
    expect(authenticatedCookie?.split(';', 1)[0]).not.toBe(
      initialCookie?.split(';', 1)[0],
    );
  });

  it('reconstructs the current user from the PostgreSQL session', async () => {
    const fixture = await createUserFixture();
    const { agent, response: loginResponse } = await loginWithCsrf(fixture);

    const sessionResponse = await agent
      .get('/auth/session')
      .expect(HttpStatus.OK);

    expect(sessionResponse.body).toEqual(loginResponse.body);
    expect(sessionResponse.body).not.toHaveProperty('senhaHash');
    expect(sessionResponse.body).not.toHaveProperty('sessionId');
  });

  it('invalidates a session when its user becomes inactive', async () => {
    const fixture = await createUserFixture();
    const { response: loginResponse } = await loginWithCsrf(fixture);
    const cookie = loginResponse.headers['set-cookie']?.[0];

    await database.usuario.update({
      where: { id: fixture.userId },
      data: { ativo: false },
    });

    const response = await request(app)
      .get('/auth/session')
      .set('Cookie', cookie ?? '')
      .expect(HttpStatus.UNAUTHORIZED);
    const persistedSession = await verificationPool.query(
      'SELECT 1 FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
      [fixture.userId],
    );

    expect(response.body).toEqual({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'AUTH_UNAUTHENTICATED',
      message: 'Authentication required',
    });
    expect(persistedSession.rowCount).toBe(0);
  });

  it('changes the required first access password, preserves spaces, and regenerates the session', async () => {
    const fixture = await createUserFixture({
      deveAlterarSenha: true,
      password: 'senha temporária',
    });
    const initialHash = (
      await database.usuario.findUniqueOrThrow({
        where: { id: fixture.userId },
      })
    ).senhaHash;
    const newPassword = ' senha nova ';
    const {
      agent,
      csrfToken: preLoginCsrfToken,
      response: loginResponse,
    } = await loginWithCsrf(fixture);
    const initialCookie = loginResponse.headers['set-cookie']?.[0];
    const initialSessionId = getSessionId(initialCookie);
    const csrfToken = await getCsrfToken(agent);
    const changeResponse = await agent
      .post('/auth/first-access/password')
      .set('X-CSRF-Token', csrfToken)
      .send({
        password: newPassword,
        passwordConfirmation: newPassword,
      })
      .expect(HttpStatus.OK);
    const regeneratedCookie = changeResponse.headers['set-cookie']?.[0];
    const persistedUser = await database.usuario.findUniqueOrThrow({
      where: { id: fixture.userId },
    });
    const persistedSessions = await verificationPool.query<{ sid: string }>(
      'SELECT "sid" FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
      [fixture.userId],
    );

    expect(changeResponse.body).toMatchObject({
      id: fixture.userId,
      deveAlterarSenha: false,
    });
    expect(csrfToken).not.toBe(preLoginCsrfToken);
    expect(regeneratedCookie?.split(';', 1)[0]).not.toBe(
      initialCookie?.split(';', 1)[0],
    );
    expect(persistedUser.senhaHash).not.toBe(initialHash);
    await expect(
      passwordService.verify(persistedUser.senhaHash, newPassword),
    ).resolves.toBe(true);
    await expect(
      passwordService.verify(persistedUser.senhaHash, newPassword.trim()),
    ).resolves.toBe(false);
    expect(persistedUser.deveAlterarSenha).toBe(false);
    expect(persistedSessions.rows).toEqual([
      { sid: expect.not.stringMatching(new RegExp(`^${initialSessionId}$`)) },
    ]);

    const sessionResponse = await agent
      .get('/auth/session')
      .expect(HttpStatus.OK);

    expect(sessionResponse.body).toEqual({
      id: fixture.userId,
      perfil: 'FUNCIONARIO',
      funcionarioId: fixture.funcionarioId,
      funcionarioNome: expect.stringContaining('Funcionário'),
      deveAlterarSenha: false,
    });
    await request(app)
      .get('/auth/session')
      .set('Cookie', initialCookie ?? '')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('rejects first access password values outside the limits and different confirmations', async () => {
    const fixture = await createUserFixture({ deveAlterarSenha: true });
    const { agent } = await loginWithCsrf(fixture);
    const csrfToken = await getCsrfToken(agent);

    for (const input of [
      { password: 'a'.repeat(7), passwordConfirmation: 'a'.repeat(7) },
      { password: 'a'.repeat(129), passwordConfirmation: 'a'.repeat(129) },
      {
        password: 'senha válida',
        passwordConfirmation: 'senha diferente',
      },
    ]) {
      await agent
        .post('/auth/first-access/password')
        .set('X-CSRF-Token', csrfToken)
        .send(input)
        .expect(HttpStatus.BAD_REQUEST)
        .expect(({ body }) => {
          expect(body.code).toBe('VALIDATION_ERROR');
        });
    }
  });

  it('requires a session to change the first access password', async () => {
    const { agent, csrfToken } = await createCsrfSession();

    await agent
      .post('/auth/first-access/password')
      .set('X-CSRF-Token', csrfToken)
      .send({
        password: 'senha válida',
        passwordConfirmation: 'senha válida',
      })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });
  });

  it('rejects an inactive account during the first access password change', async () => {
    const fixture = await createUserFixture({ deveAlterarSenha: true });
    const { agent } = await loginWithCsrf(fixture);
    const csrfToken = await getCsrfToken(agent);
    await database.usuario.update({
      where: { id: fixture.userId },
      data: { ativo: false },
    });

    await agent
      .post('/auth/first-access/password')
      .set('X-CSRF-Token', csrfToken)
      .send({
        password: 'senha válida',
        passwordConfirmation: 'senha válida',
      })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'AUTH_UNAUTHENTICATED',
        message: 'Authentication required',
      });
    await expect(
      verificationPool.query(
        'SELECT 1 FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
        [fixture.userId],
      ),
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  it('rejects a first access password change when it is not pending', async () => {
    const fixture = await createUserFixture();
    const initialHash = (
      await database.usuario.findUniqueOrThrow({
        where: { id: fixture.userId },
      })
    ).senhaHash;
    const { agent } = await loginWithCsrf(fixture);
    const csrfToken = await getCsrfToken(agent);
    await agent
      .post('/auth/first-access/password')
      .set('X-CSRF-Token', csrfToken)
      .send({
        password: 'senha válida',
        passwordConfirmation: 'senha válida',
      })
      .expect(HttpStatus.CONFLICT)
      .expect({
        statusCode: HttpStatus.CONFLICT,
        code: 'AUTH_FIRST_ACCESS_PASSWORD_NOT_REQUIRED',
        message: 'First access password change is not required',
      });

    await expect(
      database.usuario.findUniqueOrThrow({ where: { id: fixture.userId } }),
    ).resolves.toMatchObject({
      senhaHash: initialHash,
      deveAlterarSenha: false,
    });
  });

  it('destroys the PostgreSQL session and clears the cookie on logout', async () => {
    const fixture = await createUserFixture();
    const {
      agent,
      csrfToken: previousCsrfToken,
      response: loginResponse,
    } = await loginWithCsrf(fixture);
    const cookie = loginResponse.headers['set-cookie']?.[0];
    const sessionId = getSessionId(cookie);

    await expect(
      verificationPool.query('SELECT 1 FROM "session" WHERE "sid" = $1', [
        sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 1 });

    await agent
      .post('/auth/logout')
      .set('X-CSRF-Token', previousCsrfToken)
      .expect(HttpStatus.FORBIDDEN)
      .expect(csrfInvalidTokenResponse);

    const csrfToken = await getCsrfToken(agent);
    const logoutResponse = await agent
      .post('/auth/logout')
      .set('X-CSRF-Token', csrfToken)
      .expect(HttpStatus.NO_CONTENT);

    expect(logoutResponse.headers['set-cookie']?.[0]).toMatch(
      /^connect\.sid=;/,
    );
    await expect(
      verificationPool.query('SELECT 1 FROM "session" WHERE "sid" = $1', [
        sessionId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
    await request(app)
      .get('/auth/session')
      .set('Cookie', cookie ?? '')
      .expect(HttpStatus.UNAUTHORIZED);

    await request(app)
      .post('/auth/login')
      .set('Cookie', cookie ?? '')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: fixture.email, password: fixture.password })
      .expect(HttpStatus.FORBIDDEN)
      .expect(csrfInvalidTokenResponse);

    const postLogoutCsrfToken = await getCsrfToken(agent);

    await agent
      .post('/auth/logout')
      .set('X-CSRF-Token', postLogoutCsrfToken)
      .expect(HttpStatus.NO_CONTENT)
      .expect(({ headers }) => {
        expect(headers['set-cookie']?.[0]).toMatch(/^connect\.sid=;/);
      });
  });
});
