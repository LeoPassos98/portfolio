import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrateProduction } from '../../scripts/migrate-production.mjs';

// Synthetic credentials only; no test connects to PostgreSQL or starts Prisma.
const adminUrl =
  'postgresql://migration_fixture:fake-admin-password@migration.invalid:5432/fixture';
const runtimeUrl =
  'postgresql://runtime_fixture:fake-runtime-password@runtime.invalid:5432/fixture';

function createMocks(result = { status: 0 }) {
  return {
    env: { DATABASE_URL: runtimeUrl, MIGRATION_DATABASE_URL: adminUrl },
    spawn: vi.fn().mockReturnValue(result),
    logError: vi.fn(),
  };
}

function expectSafeError(logError) {
  expect(logError).toHaveBeenCalledOnce();
  const messages = logError.mock.calls.flat().join('\n');

  for (const value of [
    adminUrl,
    'migration_fixture',
    'fake-admin-password',
    'migration.invalid',
    runtimeUrl,
  ]) {
    expect(messages).not.toContain(value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('migrateProduction', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['malformed', 'not-a-url'],
    ['non-PostgreSQL', adminUrl.replace('postgresql:', 'https:')],
    ['postgres alias', adminUrl.replace('postgresql:', 'postgres:')],
    ['missing host', 'postgresql:/fixture'],
  ])(
    'rejects a %s migration URL without falling back to the runtime URL',
    (_, value) => {
      const mocks = createMocks();
      mocks.env.MIGRATION_DATABASE_URL = value;

      expect(migrateProduction(mocks)).toBe(1);
      expect(mocks.spawn).not.toHaveBeenCalled();
      expectSafeError(mocks.logError);
      if (value) {
        expect(mocks.logError.mock.calls.flat().join('\n')).not.toContain(
          value,
        );
      }
    },
  );

  it('runs only migrate deploy with the administrative URL in the child environment', () => {
    const mocks = createMocks();
    mocks.env.PATH = '/synthetic/bin';
    const parentEnv = { ...mocks.env };

    expect(migrateProduction(mocks)).toBe(0);
    expect(mocks.spawn).toHaveBeenCalledExactlyOnceWith(
      'npm',
      ['exec', '--', 'prisma', 'migrate', 'deploy'],
      {
        cwd: fileURLToPath(new URL('../../', import.meta.url)),
        env: { DATABASE_URL: adminUrl, PATH: '/synthetic/bin' },
        stdio: 'inherit',
      },
    );
    expect(mocks.spawn.mock.calls[0][2].env).not.toHaveProperty(
      'MIGRATION_DATABASE_URL',
    );
    expect(mocks.env).toEqual(parentEnv);
    expect(mocks.logError).not.toHaveBeenCalled();
  });

  it('does not require a runtime DATABASE_URL', () => {
    const mocks = createMocks();
    delete mocks.env.DATABASE_URL;

    expect(migrateProduction(mocks)).toBe(0);
    expect(mocks.spawn.mock.calls[0][2].env.DATABASE_URL).toBe(adminUrl);
    expect(mocks.env).not.toHaveProperty('DATABASE_URL');
  });

  it('reads process.env by default without mutating its credentials', () => {
    vi.stubEnv('DATABASE_URL', runtimeUrl);
    vi.stubEnv('MIGRATION_DATABASE_URL', adminUrl);
    const { spawn, logError } = createMocks();

    expect(migrateProduction({ spawn, logError })).toBe(0);
    expect(process.env.DATABASE_URL).toBe(runtimeUrl);
    expect(process.env.MIGRATION_DATABASE_URL).toBe(adminUrl);
    expect(spawn.mock.calls[0][2].env.DATABASE_URL).toBe(adminUrl);
    expect(spawn.mock.calls[0][2].env).not.toHaveProperty(
      'MIGRATION_DATABASE_URL',
    );
  });

  it.each([1, 2, 255])('propagates Prisma failure status %s', (status) => {
    expect(migrateProduction(createMocks({ status }))).toBe(status);
  });

  it.each([null, 0])(
    'fails when spawn returns an error, even with status %s',
    (status) => {
      const mocks = createMocks({ status, error: new Error(adminUrl) });

      expect(migrateProduction(mocks)).toBe(1);
      expectSafeError(mocks.logError);
    },
  );

  it('sanitizes a thrown spawn error', () => {
    const mocks = createMocks();
    mocks.spawn.mockImplementation(() => {
      throw new Error(adminUrl);
    });

    expect(migrateProduction(mocks)).toBe(1);
    expectSafeError(mocks.logError);
  });

  it.each([null, undefined, -1, 0.5, '0', 256, NaN])(
    'fails with unusable status %s',
    (status) => {
      const mocks = createMocks({ status });

      expect(migrateProduction(mocks)).toBe(1);
      expectSafeError(mocks.logError);
    },
  );

  it('fails when the subprocess is terminated by a signal', () => {
    const mocks = createMocks({ status: null, signal: 'SIGTERM' });

    expect(migrateProduction(mocks)).toBe(1);
    expectSafeError(mocks.logError);
  });
});
