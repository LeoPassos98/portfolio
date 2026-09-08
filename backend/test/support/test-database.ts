import dotenv from 'dotenv';

const testDatabaseName = 'portfolio_test';

function validateTestDatabaseUrl(value: string): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      'PostgreSQL tests require TEST_DATABASE_URL to point to the isolated portfolio_test database.',
    );
  }

  if (
    url.protocol !== 'postgresql:' ||
    url.pathname !== `/${testDatabaseName}`
  ) {
    throw new Error(
      `PostgreSQL tests require TEST_DATABASE_URL to point to the isolated ${testDatabaseName} database; received database "${decodeURIComponent(url.pathname.slice(1)) || '(missing)'}".`,
    );
  }
}

export function configureTestDatabase(): string {
  dotenv.config({ path: '.env', quiet: true });
  dotenv.config({ path: '.env.test', override: true, quiet: true });

  const databaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'PostgreSQL tests require TEST_DATABASE_URL for the isolated portfolio_test database.',
    );
  }

  validateTestDatabaseUrl(databaseUrl);
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;

  return databaseUrl;
}
