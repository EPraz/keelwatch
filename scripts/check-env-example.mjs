import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const repositoryRoot = process.cwd();
const readRepositoryFile = (path) => readFile(join(repositoryRoot, path), 'utf8');
const [example, apiEnvironment, webEnvironment, prismaSchema, gitignore] =
  await Promise.all([
    readRepositoryFile('.env.example'),
    readRepositoryFile('apps/api/src/config/environment.ts'),
    readRepositoryFile('apps/web/src/vite-env.d.ts'),
    readRepositoryFile('apps/api/prisma/schema.prisma'),
    readRepositoryFile('.gitignore'),
  ]);

const collectMatches = (source, pattern) =>
  new Set([...source.matchAll(pattern)].map((match) => match[1]));
const expectedKeys = new Set([
  ...collectMatches(apiEnvironment, /^ {2}([A-Z][A-Z0-9_]+):/gmu),
  ...collectMatches(webEnvironment, /readonly (VITE_[A-Z0-9_]+)\?:/gu),
  ...collectMatches(prismaSchema, /env\("([A-Z][A-Z0-9_]+)"\)/gu),
]);
const declaredKeys = collectMatches(example, /^(?:#\s*)?([A-Z][A-Z0-9_]*)=/gmu);
const missingKeys = [...expectedKeys].filter((key) => !declaredKeys.has(key));
const unexpectedKeys = [...declaredKeys].filter((key) => !expectedKeys.has(key));

if (missingKeys.length || unexpectedKeys.length) {
  throw new Error(
    `Environment example mismatch. Missing: ${missingKeys.join(', ') || 'none'}. ` +
      `Unexpected: ${unexpectedKeys.join(', ') || 'none'}.`,
  );
}

const activeValues = parseEnv(example);
const localDefaults = {
  NODE_ENV: 'development',
  PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5173',
  AUTH_MODE: 'local',
  ACCESS_STORE: 'memory',
  VITE_AUTH_MODE: 'local',
  VITE_API_URL: '/api/v1',
};

for (const [key, expectedValue] of Object.entries(localDefaults)) {
  if (activeValues[key] !== expectedValue) {
    throw new Error(`${key} must default to ${expectedValue} in .env.example.`);
  }
}

for (const key of [...declaredKeys].filter(
  (value) => value.includes('OIDC') || value.startsWith('SEED_'),
)) {
  if (key in activeValues) {
    throw new Error(`${key} must remain commented in the synthetic local defaults.`);
  }
}

if (!activeValues.DATABASE_URL?.includes('keelwatch-local-only@localhost')) {
  throw new Error(
    'DATABASE_URL must remain an unmistakably local synthetic placeholder.',
  );
}

if (!/^\.env$/mu.test(gitignore) || !/^!\.env\.example$/mu.test(gitignore)) {
  throw new Error('.gitignore must ignore .env and retain .env.example.');
}

console.log(`Environment example covers ${expectedKeys.size} application variables.`);
