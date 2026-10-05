import { Client } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeSessionPgConnectionString } from './session-pg-connection.js';

const fixtureUrl =
  'postgresql://fixture:encoded%40password@localhost:5432/fixture';

afterEach(() => vi.restoreAllMocks());

describe('Session pg SSL normalization', () => {
  it.each(['prefer', 'require', 'verify-ca'])(
    'makes %s explicit without weakening TLS or emitting a warning',
    (mode) => {
      const warn = vi
        .spyOn(process, 'emitWarning')
        .mockImplementation(() => {});
      const client = new Client({
        connectionString: normalizeSessionPgConnectionString(
          `${fixtureUrl}?sslmode=${mode}`,
        ),
      });
      expect(client.ssl).toEqual({});
      expect(client.ssl).not.toHaveProperty('rejectUnauthorized', false);
      expect(client.ssl).not.toHaveProperty('checkServerIdentity');
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('preserves credentials and unrelated parameters without mutating the input', () => {
    const input = `${fixtureUrl}?sslmode=require&application_name=demo&sslrootcert=%2Ftmp%2Ffixture-ca.pem`;
    const original = new URL(input);
    const normalized = new URL(normalizeSessionPgConnectionString(input));
    expect(normalized.searchParams.get('sslmode')).toBe('verify-full');
    for (const key of [
      'username',
      'password',
      'hostname',
      'port',
      'pathname',
    ] as const)
      expect(normalized[key]).toBe(original[key]);
    expect(normalized.searchParams.get('application_name')).toBe('demo');
    expect(normalized.searchParams.get('sslrootcert')).toBe(
      '/tmp/fixture-ca.pem',
    );
    expect(original.searchParams.get('sslmode')).toBe('require');
  });

  it.each([
    '',
    '?sslmode=disable',
    '?sslmode=no-verify',
    '?sslmode=verify-full',
    '?sslmode=require&uselibpqcompat=true',
  ])('preserves explicitly configured semantics %s', (query) => {
    expect(normalizeSessionPgConnectionString(fixtureUrl + query)).toBe(
      fixtureUrl + query,
    );
  });

  it('uses the last duplicate SSL mode as pg does', () => {
    expect(
      new URL(
        normalizeSessionPgConnectionString(
          `${fixtureUrl}?sslmode=disable&sslmode=require`,
        ),
      ).searchParams.getAll('sslmode'),
    ).toEqual(['verify-full']);
    expect(
      normalizeSessionPgConnectionString(
        `${fixtureUrl}?sslmode=require&sslmode=disable`,
      ),
    ).toBe(`${fixtureUrl}?sslmode=require&sslmode=disable`);
  });
});
