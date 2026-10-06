import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const repositoryEnvironmentFile = fileURLToPath(
  new URL('../../../.env', import.meta.url),
);
if (existsSync(repositoryEnvironmentFile)) {
  process.loadEnvFile(repositoryEnvironmentFile);
}

const engineDirectory = dirname(require.resolve('@prisma/engines/package.json'));
const engineFilename = readdirSync(engineDirectory).find((name) =>
  name.startsWith('schema-engine-'),
);
const localEnginePath = engineFilename
  ? join(engineDirectory, engineFilename)
  : undefined;
const environment = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://keelwatch:keelwatch@127.0.0.1:5432/keelwatch_schema_validation?schema=public',
  ...process.env,
};

if (!environment.PRISMA_SCHEMA_ENGINE_BINARY && localEnginePath) {
  environment.PRISMA_SCHEMA_ENGINE_BINARY = localEnginePath;
}

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)],
  {
    env: environment,
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
