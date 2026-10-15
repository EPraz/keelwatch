import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  openSync,
  closeSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';

const root = process.cwd();
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const directory = resolve(root, '.scratch/maintenance-capture');
const manifest = resolve(directory, 'private-runtime.json');
const mode = process.argv[2];
const schemaPattern = /^kw_capture_[a-f0-9]{32}$/u;
mkdirSync(directory, { recursive: true });
if (existsSync('.env')) process.loadEnvFile('.env');

function localUrl(value) {
  const url = new URL(value);
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error('Capture requires an existing local PostgreSQL connection.');
  return url;
}

async function fingerprint(database) {
  const tables =
    await database.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const result = {};
  for (const { tablename } of tables) {
    const identifier = `"${tablename.replaceAll('"', '""')}"`;
    const rows = await database.$queryRawUnsafe(
      `SELECT to_jsonb(t)::text AS row FROM public.${identifier} AS t ORDER BY to_jsonb(t)::text`,
    );
    result[tablename] = {
      count: rows.length,
      sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    };
  }
  return result;
}

function environment(state) {
  return {
    ...process.env,
    NODE_ENV: 'development',
    DATABASE_URL: state.databaseUrl,
    AUTH_MODE: 'local',
    ACCESS_STORE: 'prisma',
    PORT: '3197',
    WEB_ORIGIN: 'http://127.0.0.1:5197',
    VITE_AUTH_MODE: 'local',
    VITE_API_URL: '/api/v1',
    DEMO_ACCESS_ENABLED: 'true',
    DEMO_SESSION_SECRET: state.secret,
    SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|synthetic-capture-manager',
    SEED_AUDITOR_SUBJECT: 'auth0|synthetic-capture-auditor',
  };
}

function prisma(state, args) {
  const result = spawnSync(process.execPath, ['scripts/prisma-cli.mjs', ...args], {
    cwd: resolve(root, 'apps/api'),
    env: environment(state),
    stdio: 'pipe',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0)
    throw new Error('Capture migration/seed failed; connection details withheld.');
}

async function prepare() {
  const original = localUrl(process.env.DATABASE_URL);
  if ((original.searchParams.get('schema') ?? 'public') !== 'public')
    throw new Error('Preparation expects the retained local public schema.');
  const database = new PrismaClient({
    datasources: { db: { url: original.toString() } },
  });
  let isolated;
  try {
    const [{ version }] =
      await database.$queryRaw`SELECT current_setting('server_version') AS version`;
    const before = await fingerprint(database);
    const schema = `kw_capture_${randomUUID().replaceAll('-', '')}`;
    if (!schemaPattern.test(schema)) throw new Error('Invalid capture schema.');
    await database.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    original.searchParams.set('schema', schema);
    const state = {
      schema,
      databaseUrl: original.toString(),
      secret: randomBytes(32).toString('base64url'),
      source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      preparedAt: new Date().toISOString(),
      postgres: version,
      before,
    };
    isolated = new PrismaClient({ datasources: { db: { url: state.databaseUrl } } });
    const [{ current }] = await isolated.$queryRaw`SELECT current_schema() AS current`;
    const [{ count }] =
      await isolated.$queryRaw`SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = current_schema()`;
    if (current !== schema || count !== 0)
      throw new Error('Isolation check failed before migration.');
    // Store privately before provisioning so a failed run still has a recovery pointer.
    writeFileSync(manifest, JSON.stringify(state, null, 2));
    prisma(state, ['migrate', 'deploy']);
    prisma(state, ['db', 'seed']);
    prisma(state, ['db', 'seed', '--', '--demo']);
    if (JSON.stringify(before) !== JSON.stringify(await fingerprint(database)))
      throw new Error('Retained public data changed during preparation.');
    console.log(
      JSON.stringify({
        prepared: true,
        schema,
        postgres: version,
        retainedTables: Object.keys(before).length,
      }),
    );
  } finally {
    await isolated?.$disconnect();
    await database.$disconnect();
  }
}

async function verify(state) {
  const url = localUrl(state.databaseUrl);
  if (
    !schemaPattern.test(state.schema) ||
    url.searchParams.get('schema') !== state.schema
  )
    throw new Error('Invalid private capture manifest.');
  const isolated = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  url.searchParams.set('schema', 'public');
  const retained = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const [{ current }] = await isolated.$queryRaw`SELECT current_schema() AS current`;
    if (current !== state.schema) throw new Error('Capture schema mismatch.');
    if (JSON.stringify(state.before) !== JSON.stringify(await fingerprint(retained)))
      throw new Error('Retained public data differs from preparation.');
    console.log(
      JSON.stringify({
        isolated: true,
        retainedTablesUnchanged: Object.keys(state.before).length,
        migrations:
          await isolated.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
      }),
    );
  } finally {
    await isolated.$disconnect();
    await retained.$disconnect();
  }
}

async function serve(state) {
  await verify(state);
  execFileSync('git', ['diff', '--exit-code', state.source, '--', 'apps'], {
    stdio: 'pipe',
  });
  for (const port of [3197, 5197]) {
    await new Promise((done, reject) => {
      const probe = createNetServer();
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', () => probe.close(done));
    });
  }
  Object.assign(process.env, environment(state));
  const { createServer } = await import('vite');
  let api;
  let web;
  let closing;
  const stop = () =>
    (closing ??= (async () => {
      api?.kill();
      await web?.close();
    })());
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
  try {
    // Initialize Vite before launching the API; either failure shares cleanup.
    web = await createServer({
      root: resolve(root, 'apps/web'),
      configFile: resolve(root, 'apps/web/vite.config.ts'),
      envDir: root,
      server: {
        host: '127.0.0.1',
        port: 5197,
        strictPort: true,
        proxy: { '/api': 'http://127.0.0.1:3197' },
      },
    });
    if (closing) {
      await web.close();
      return;
    }
    const output = openSync(resolve(directory, 'api.log'), 'a');
    try {
      api = spawn(process.execPath, ['dist/main.js'], {
        cwd: resolve(root, 'apps/api'),
        env: environment(state),
        windowsHide: true,
        stdio: ['ignore', output, output],
      });
      api.once('error', () => {
        process.exitCode = 1;
        console.error('Capture API could not start.');
        void stop();
      });
      api.once('exit', (code) => {
        if (code) process.exitCode = code;
        void stop();
      });
    } finally {
      closeSync(output);
    }
    await web.listen();
    console.log(
      'Capture web: http://127.0.0.1:5197; API: http://127.0.0.1:3197. Stop with Ctrl+C.',
    );
  } catch (error) {
    await stop();
    throw error;
  }
}

async function test(state) {
  await verify(state);
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      'vitest.postgres.config.mts',
      '--maxWorkers',
      '1',
      'test/maintenance.postgres.integration.spec.ts',
      'test/maintenance-lifecycle.postgres.integration.spec.ts',
      'test/maintenance-history.postgres.integration.spec.ts',
    ],
    {
      cwd: resolve(root, 'apps/api'),
      env: { ...environment(state), NODE_ENV: 'test' },
      stdio: 'inherit',
    },
  );
  if (result.error || result.status !== 0)
    throw new Error('Capture PostgreSQL regressions failed.');
  await verify(state);
}

try {
  if (mode === 'prepare') await prepare();
  else if (['serve', 'verify', 'test'].includes(mode)) {
    const state = JSON.parse(readFileSync(manifest, 'utf8'));
    if (mode === 'serve') await serve(state);
    else if (mode === 'test') await test(state);
    else await verify(state);
  } else throw new Error('Use prepare, serve, verify or test from the repository root.');
} catch {
  console.error(
    'Capture environment failed. Check local PostgreSQL, private manifest and unused ports; no connection details emitted.',
  );
  process.exitCode = 1;
}
