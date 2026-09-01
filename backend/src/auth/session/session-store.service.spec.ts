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

  return app;
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
