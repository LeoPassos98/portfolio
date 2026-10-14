import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

function isPostgresqlUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'postgresql:' && url.hostname !== '';
  } catch {
    return false;
  }
}

export function migrateProduction({
  env = process.env,
  spawn = spawnSync,
  logError = console.error,
} = {}) {
  const databaseUrl = env.MIGRATION_DATABASE_URL;

  if (!isPostgresqlUrl(databaseUrl)) {
    logError(
      'MIGRATION_DATABASE_URL is required and must be a valid postgresql:// URL.',
    );
    return 1;
  }

  const childEnv = { ...env, DATABASE_URL: databaseUrl };
  delete childEnv.MIGRATION_DATABASE_URL;

  let result;

  try {
    result = spawn('npm', ['exec', '--', 'prisma', 'migrate', 'deploy'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: childEnv,
      stdio: 'inherit',
    });
  } catch {
    logError('Unable to start the production migration subprocess.');
    return 1;
  }

  if (result?.error) {
    logError('Unable to start the production migration subprocess.');
    return 1;
  }

  const status = result?.status;

  if (
    result?.signal ||
    !Number.isInteger(status) ||
    status < 0 ||
    status > 255
  ) {
    logError(
      'Production migration subprocess ended without a usable exit status.',
    );
    return 1;
  }

  return status;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = migrateProduction();
}
