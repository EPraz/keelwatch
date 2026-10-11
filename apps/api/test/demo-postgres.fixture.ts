import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export async function createDemoPostgresFixture() {
  const environmentFile = resolve(__dirname, '../../../.env');
  if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) throw new Error('Demo PostgreSQL tests require DATABASE_URL.');
  const target = new URL(originalUrl);
  if (!['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('Isolated demo PostgreSQL tests require a local database.');
  }
  const schema = `kw_demo_test_${randomUUID().replaceAll('-', '')}`;
  if (!/^kw_demo_test_[a-f0-9]{32}$/u.test(schema))
    throw new Error('Invalid test schema.');
  const admin = new PrismaClient({ datasources: { db: { url: originalUrl } } });
  target.searchParams.set('schema', schema);
  const databaseUrl = target.toString();
  let created = false;
  const database = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  function run(command: readonly string[]) {
    const result = spawnSync(process.execPath, ['scripts/prisma-cli.mjs', ...command], {
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        DEMO_ACCESS_ENABLED: 'true',
        SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|synthetic-demo-test-manager',
        SEED_AUDITOR_SUBJECT: 'auth0|synthetic-demo-test-auditor',
      },
      stdio: 'pipe',
      timeout: 25_000,
    });
    if (result.error || result.status !== 0)
      throw new Error(
        `Isolated Prisma ${command.join(' ')} failed; no connection details emitted.`,
      );
  }

  async function close() {
    await database.$disconnect();
    if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
    process.env.DATABASE_URL = originalUrl;
  }

  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    process.env.DATABASE_URL = databaseUrl;
    run(['migrate', 'deploy']);
    run(['db', 'seed']);
    return { database, databaseUrl, seed: () => run(['db', 'seed']), close };
  } catch (error) {
    await close();
    throw error;
  }
}
