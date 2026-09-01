import { describe, expect, it } from 'vitest';
import { createSessionOptions } from './session.middleware.js';

const store = {} as Parameters<typeof createSessionOptions>[0]['store'];

describe('createSessionOptions', () => {
  it('uses a secure cookie only in production', () => {
    const developmentOptions = createSessionOptions({
      store,
      secret: 'test-session-secret-with-at-least-32-characters',
      isProduction: false,
      maxAgeMs: 28_800_000,
    });
    const productionOptions = createSessionOptions({
      store,
      secret: 'test-session-secret-with-at-least-32-characters',
      isProduction: true,
      maxAgeMs: 28_800_000,
    });

    expect(developmentOptions).toMatchObject({
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 28_800_000,
      },
    });
    expect(developmentOptions.cookie).not.toHaveProperty('domain');
    expect(productionOptions.cookie).toMatchObject({ secure: true });
  });
});
