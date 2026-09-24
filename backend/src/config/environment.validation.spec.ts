import { validateEnvironment } from './environment.validation.js';

const requiredEnvironment = {
  DATABASE_URL: 'postgresql://portfolio_user:password@localhost:5432/portfolio',
  SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
  DEMO_IP_HMAC_SECRET: 'test-demo-hmac-secret-with-at-least-32-characters',
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

  it('rejects a missing DEMO IP HMAC secret without exposing other secrets', () => {
    const { DEMO_IP_HMAC_SECRET: _, ...environmentWithoutDemoSecret } =
      requiredEnvironment;

    expect(() => validateEnvironment(environmentWithoutDemoSecret)).toThrow(
      'DEMO_IP_HMAC_SECRET',
    );

    try {
      validateEnvironment(environmentWithoutDemoSecret);
    } catch (error) {
      expect(String(error)).not.toContain(requiredEnvironment.SESSION_SECRET);
    }
  });

  it('rejects a short DEMO IP HMAC secret without exposing its value', () => {
    const shortSecret = 'short-demo-secret';

    try {
      validateEnvironment({
        ...requiredEnvironment,
        DEMO_IP_HMAC_SECRET: shortSecret,
      });
      expect.unreachable('Expected invalid DEMO IP HMAC secret to be rejected');
    } catch (error) {
      expect(String(error)).toContain('DEMO_IP_HMAC_SECRET');
      expect(String(error)).not.toContain(shortSecret);
    }
  });
});
