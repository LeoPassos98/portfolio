import { validateEnvironment } from './environment.validation.js';

const requiredEnvironment = {
  DATABASE_URL: 'postgresql://portfolio_user:password@localhost:5432/portfolio',
  SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

describe('validateEnvironment', () => {
  it('accepts a valid configuration and applies defaults', () => {
    expect(validateEnvironment(requiredEnvironment)).toEqual({
      ...requiredEnvironment,
      NODE_ENV: 'development',
      PORT: 3000,
      SESSION_MAX_AGE_MS: 28_800_000,
    });
  });

  it('rejects a missing required configuration', () => {
    const { DATABASE_URL: _, ...environmentWithoutDatabaseUrl } =
      requiredEnvironment;

    expect(() => validateEnvironment(environmentWithoutDatabaseUrl)).toThrow(
      'DATABASE_URL',
    );
  });

  it('rejects invalid configuration values', () => {
    expect(() =>
      validateEnvironment({
        ...requiredEnvironment,
        PORT: 'not-a-port',
      }),
    ).toThrow('PORT');
  });

  it('rejects a non-positive session duration', () => {
    expect(() =>
      validateEnvironment({
        ...requiredEnvironment,
        SESSION_MAX_AGE_MS: '0',
      }),
    ).toThrow('SESSION_MAX_AGE_MS');
  });
});
