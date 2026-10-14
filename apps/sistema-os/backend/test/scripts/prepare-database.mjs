import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';

const testDatabaseName = 'portfolio_test';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.test', override: true, quiet: true });

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'PostgreSQL tests require TEST_DATABASE_URL for the isolated portfolio_test database.',
  );
}

let databaseName;

try {
  const url = new URL(databaseUrl);
  databaseName = decodeURIComponent(url.pathname.slice(1));

  if (url.protocol !== 'postgresql:' || databaseName !== testDatabaseName) {
    throw new Error();
  }
} catch {
  throw new Error(
    `PostgreSQL tests require TEST_DATABASE_URL to point to the isolated ${testDatabaseName} database; received database "${databaseName || '(missing)'}".`,
  );
}

const result = spawnSync('npm', ['exec', 'prisma', 'migrate', 'deploy'], {
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
