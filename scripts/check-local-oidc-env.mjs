import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

const environmentPath = new URL('../.env', import.meta.url);
const shouldNormalize = process.argv.includes('--normalize');

function normalizeAuthority(value, key) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${key} is required for local OIDC.`);
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`${key} must be a valid Auth0 origin.`);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replaceAll('/', '')
  ) {
    throw new Error(`${key} must be an HTTPS origin without credentials or a path.`);
  }
  url.pathname = '/';
  return url.toString();
}

function replaceValue(source, key, value) {
  const pattern = new RegExp(`^(${key}=).*$`, 'mu');
  if (!pattern.test(source)) throw new Error(`${key} must be declared in .env.`);
  return source.replace(pattern, (_line, prefix) => `${prefix}${value}`);
}

function assertLocalOidc(environment) {
  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const issuer = normalizeAuthority(environment.OIDC_ISSUER, 'OIDC_ISSUER');
  const authority = normalizeAuthority(
    environment.VITE_OIDC_AUTHORITY,
    'VITE_OIDC_AUTHORITY',
  );
  const managerSubject = environment.SEED_OPERATIONS_MANAGER_SUBJECT?.trim();
  const auditorSubject = environment.SEED_AUDITOR_SUBJECT?.trim();

  expect(environment.NODE_ENV === 'development', 'NODE_ENV must be development.');
  expect(environment.AUTH_MODE === 'oidc', 'AUTH_MODE must be oidc.');
  expect(environment.VITE_AUTH_MODE === 'oidc', 'VITE_AUTH_MODE must be oidc.');
  expect(environment.ACCESS_STORE === 'prisma', 'ACCESS_STORE must be prisma.');
  expect(
    environment.WEB_ORIGIN === 'http://localhost:5173',
    'WEB_ORIGIN must match the local browser origin.',
  );
  expect(
    environment.VITE_API_URL === '/api/v1',
    'VITE_API_URL must use the local Vite proxy.',
  );
  expect(issuer === authority, 'OIDC issuer and browser authority must match.');
  expect(Boolean(environment.OIDC_AUDIENCE?.trim()), 'OIDC_AUDIENCE is required.');
  expect(
    environment.OIDC_AUDIENCE === environment.VITE_OIDC_AUDIENCE,
    'API and browser OIDC audiences must match.',
  );
  expect(
    Boolean(environment.VITE_OIDC_CLIENT_ID?.trim()),
    'VITE_OIDC_CLIENT_ID is required.',
  );
  expect(Boolean(managerSubject && auditorSubject), 'Both seed subjects are required.');
  expect(managerSubject !== auditorSubject, 'Seed subjects must be distinct.');
  expect(Boolean(environment.DATABASE_URL?.trim()), 'DATABASE_URL is required.');
  expect(
    !Object.entries(environment).some(
      ([key, value]) => key.startsWith('VITE_') && key.includes('SECRET') && value,
    ),
    'Do not expose a secret through a VITE_ variable.',
  );

  if (failures.length) {
    throw new Error(
      `Local OIDC environment is inconsistent:\n- ${failures.join('\n- ')}`,
    );
  }
}

let source = await readFile(environmentPath, 'utf8');
if (shouldNormalize) {
  const current = parseEnv(source);
  const issuer = normalizeAuthority(current.OIDC_ISSUER, 'OIDC_ISSUER');
  const authority = normalizeAuthority(
    current.VITE_OIDC_AUTHORITY,
    'VITE_OIDC_AUTHORITY',
  );
  if (issuer !== authority) {
    throw new Error('OIDC issuer and browser authority must identify the same origin.');
  }
  source = replaceValue(source, 'AUTH_MODE', 'oidc');
  source = replaceValue(source, 'ACCESS_STORE', 'prisma');
  source = replaceValue(source, 'VITE_AUTH_MODE', 'oidc');
  source = replaceValue(source, 'OIDC_ISSUER', issuer);
  source = replaceValue(source, 'VITE_OIDC_AUTHORITY', authority);
  await writeFile(environmentPath, source, 'utf8');
  console.log('Normalized local OIDC modes and authority URLs (values redacted).');
}

assertLocalOidc(parseEnv(source));
console.log(
  'Local OIDC environment is consistent for localhost callback, logout, API, and seed use (values redacted).',
);
