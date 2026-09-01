import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import type { Request } from 'express';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Environment } from '../../config/environment.validation.js';
import { SessionStoreService } from './session-store.service.js';

declare module 'express-session' {
  interface SessionData {
    sessionFixtureId?: string;
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run session persistence tests.');
}

function createConfigService(maxAgeMs = 28_800_000) {
  return new ConfigService<Environment, true>(
    {
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
      SESSION_MAX_AGE_MS: maxAgeMs,
      FRONTEND_ORIGIN: 'http://localhost:5173',
    },
    { skipProcessEnv: true },
  );
}

function createFixtureApp(sessionStoreService: SessionStoreService) {
  const app = express();

  app.use(sessionStoreService.middleware);
  app.get('/session-fixture', (request: Request, response) => {
    request.session.sessionFixtureId ??= crypto.randomUUID();
    response.json({ fixtureId: request.session.sessionFixtureId });
  });
  app.get('/user-session-fixture/:usuarioId', (request: Request, response) => {
    request.session.usuarioId = request.params.usuarioId;
    request.session.csrfToken = crypto.randomUUID();
    response.json({ csrfToken: request.session.csrfToken });
  });
  app.get('/current-user-session', (request: Request, response) => {
    response.json({
      usuarioId: request.session.usuarioId,
      csrfToken: request.session.csrfToken,
    });
  });

  return app;
}

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
    throw new Error('Expected a signed session cookie.');
  }

  return sessionId;
}

async function removeFixtureSessions(pool: Pool, fixtureIds: string[]) {
  if (fixtureIds.length === 0) {
    return;
  }

  await pool.query(
    'DELETE FROM "session" WHERE "sess" ->> \'sessionFixtureId\' = ANY($1::text[])',
    [fixtureIds],
  );
}

async function removeSessionsById(pool: Pool, sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return;
  }

  await pool.query('DELETE FROM "session" WHERE "sid" = ANY($1)', [sessionIds]);
}

describe('SessionStoreService', () => {
  it('persists and restores a session using the signed cookie', async () => {
    const sessionStoreService = new SessionStoreService(createConfigService());
    const verificationPool = new Pool({ connectionString: databaseUrl });
    const app = createFixtureApp(sessionStoreService);
    const fixtureIds: string[] = [];

    try {
      const firstResponse = await request(app)
        .get('/session-fixture')
        .expect(200);
      const cookie = firstResponse.headers['set-cookie']?.[0];
      const firstFixtureId = firstResponse.body.fixtureId as string;

      fixtureIds.push(firstFixtureId);
      expect(cookie?.startsWith('connect.sid=s%3A')).toBe(true);
      expect(cookie?.includes('HttpOnly')).toBe(true);
      expect(cookie?.includes('SameSite=Lax')).toBe(true);
      expect(cookie?.includes('Secure')).toBe(false);
      expect(cookie?.includes(firstFixtureId)).toBe(false);

      if (!cookie) {
        throw new Error('Session cookie was not issued.');
      }

      const persistedSession = await verificationPool.query(
        'SELECT 1 FROM "session" WHERE "sess" ->> \'sessionFixtureId\' = $1',
        [firstFixtureId],
      );

      expect(persistedSession.rowCount).toBe(1);

      const secondResponse = await request(app)
        .get('/session-fixture')
        .set('Cookie', cookie)
        .expect(200);

      expect(secondResponse.body.fixtureId).toBe(firstFixtureId);
    } finally {
      await removeFixtureSessions(verificationPool, fixtureIds);
      await sessionStoreService.onModuleDestroy();
      await verificationPool.end();
    }
  });

  it('does not renew the server-side expiration when a session is read', async () => {
    const sessionStoreService = new SessionStoreService(
      createConfigService(1_000),
    );
    const verificationPool = new Pool({ connectionString: databaseUrl });
    const app = createFixtureApp(sessionStoreService);
    const fixtureIds: string[] = [];

    try {
      const firstResponse = await request(app)
        .get('/session-fixture')
        .expect(200);
      const cookie = firstResponse.headers['set-cookie']?.[0];
      const firstFixtureId = firstResponse.body.fixtureId as string;

      fixtureIds.push(firstFixtureId);
      await new Promise((resolve) => setTimeout(resolve, 2_100));

      const secondResponse = await request(app)
        .get('/session-fixture')
        .set('Cookie', cookie)
        .expect(200);
      const secondFixtureId = secondResponse.body.fixtureId as string;

      fixtureIds.push(secondFixtureId);
      expect(secondFixtureId).not.toBe(firstFixtureId);
    } finally {
      await removeFixtureSessions(verificationPool, fixtureIds);
      await sessionStoreService.onModuleDestroy();
      await verificationPool.end();
    }
  });

  it('revokes one user session without affecting another user', async () => {
    const sessionStoreService = new SessionStoreService(createConfigService());
    const verificationPool = new Pool({ connectionString: databaseUrl });
    const app = createFixtureApp(sessionStoreService);
    const revokedUserId = crypto.randomUUID();
    const otherUserId = crypto.randomUUID();
    const sessionIds: string[] = [];

    try {
      const revokedResponse = await request(app)
        .get(`/user-session-fixture/${revokedUserId}`)
        .expect(200);
      const otherResponse = await request(app)
        .get(`/user-session-fixture/${otherUserId}`)
        .expect(200);
      const revokedCookie = revokedResponse.headers['set-cookie']?.[0];
      const otherCookie = otherResponse.headers['set-cookie']?.[0];

      sessionIds.push(getSessionId(revokedCookie), getSessionId(otherCookie));

      await expect(
        sessionStoreService.revokeUserSessions(revokedUserId),
      ).resolves.toBe(1);
      await expect(
        verificationPool.query(
          'SELECT 1 FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
          [revokedUserId],
        ),
      ).resolves.toMatchObject({ rowCount: 0 });
      await expect(
        verificationPool.query(
          'SELECT 1 FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
          [otherUserId],
        ),
      ).resolves.toMatchObject({ rowCount: 1 });
      await request(app)
        .get('/current-user-session')
        .set('Cookie', revokedCookie ?? '')
        .expect(200)
        .expect({});
      await request(app)
        .get('/current-user-session')
        .set('Cookie', otherCookie ?? '')
        .expect(200)
        .expect({
          usuarioId: otherUserId,
          csrfToken: otherResponse.body.csrfToken,
        });
    } finally {
      await removeSessionsById(verificationPool, sessionIds);
      await sessionStoreService.onModuleDestroy();
      await verificationPool.end();
    }
  });

  it('revokes every session and CSRF token associated with a user', async () => {
    const sessionStoreService = new SessionStoreService(createConfigService());
    const verificationPool = new Pool({ connectionString: databaseUrl });
    const app = createFixtureApp(sessionStoreService);
    const usuarioId = crypto.randomUUID();
    const sessionIds: string[] = [];

    try {
      const [firstResponse, secondResponse] = await Promise.all([
        request(app).get(`/user-session-fixture/${usuarioId}`).expect(200),
        request(app).get(`/user-session-fixture/${usuarioId}`).expect(200),
      ]);
      const firstCookie = firstResponse.headers['set-cookie']?.[0];
      const secondCookie = secondResponse.headers['set-cookie']?.[0];

      sessionIds.push(getSessionId(firstCookie), getSessionId(secondCookie));
      await expect(
        sessionStoreService.revokeUserSessions(usuarioId),
      ).resolves.toBe(2);
      await expect(
        verificationPool.query(
          'SELECT 1 FROM "session" WHERE "sess" ->> \'usuarioId\' = $1',
          [usuarioId],
        ),
      ).resolves.toMatchObject({ rowCount: 0 });
      await request(app)
        .get('/current-user-session')
        .set('Cookie', firstCookie ?? '')
        .expect(200)
        .expect({});
      await request(app)
        .get('/current-user-session')
        .set('Cookie', secondCookie ?? '')
        .expect(200)
        .expect({});
    } finally {
      await removeSessionsById(verificationPool, sessionIds);
      await sessionStoreService.onModuleDestroy();
      await verificationPool.end();
    }
  });

  it('safely reports no revocation for a user without sessions', async () => {
    const sessionStoreService = new SessionStoreService(createConfigService());

    try {
      await expect(
        sessionStoreService.revokeUserSessions(crypto.randomUUID()),
      ).resolves.toBe(0);
    } finally {
      await sessionStoreService.onModuleDestroy();
    }
  });

  it('closes the store and its PostgreSQL pool on shutdown', async () => {
    const sessionStoreService = new SessionStoreService(createConfigService());
    const sessionStore = sessionStoreService as unknown as {
      pool: Pool;
      store: { close: () => Promise<void> };
    };
    const closeStore = vi.spyOn(sessionStore.store, 'close');
    const endPool = vi.spyOn(sessionStore.pool, 'end');

    await sessionStoreService.onModuleDestroy();

    expect(closeStore).toHaveBeenCalledOnce();
    expect(endPool).toHaveBeenCalledOnce();
  });
});
