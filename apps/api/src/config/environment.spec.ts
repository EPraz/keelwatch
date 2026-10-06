import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('accepts the server values from the repository environment example', () => {
    const example = parseEnv(
      readFileSync(resolve(__dirname, '../../../../.env.example'), 'utf8'),
    );

    expect(validateEnvironment(example)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      WEB_ORIGIN: 'http://localhost:5173',
      AUTH_MODE: 'local',
      ACCESS_STORE: 'memory',
    });
  });

  it('accepts the explicit local, in-memory development mode', () => {
    const environment = validateEnvironment({
      NODE_ENV: 'development',
      AUTH_MODE: 'local',
      ACCESS_STORE: 'memory',
    });

    expect(environment.AUTH_MODE).toBe('local');
    expect(environment.ACCESS_STORE).toBe('memory');
  });

  it('normalizes a secure OIDC issuer in development', () => {
    const environment = validateEnvironment({
      NODE_ENV: 'development',
      AUTH_MODE: 'oidc',
      ACCESS_STORE: 'prisma',
      OIDC_ISSUER: 'https://identity.example.test',
      OIDC_AUDIENCE: 'https://api.example.test',
    });

    expect(environment.OIDC_ISSUER).toBe('https://identity.example.test/');
  });

  it('rejects an insecure OIDC issuer in development', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        AUTH_MODE: 'oidc',
        ACCESS_STORE: 'prisma',
        OIDC_ISSUER: 'http://identity.example.test',
        OIDC_AUDIENCE: 'https://api.example.test',
      }),
    ).toThrow('OIDC mode requires an HTTPS OIDC_ISSUER.');
  });

  it('requires configured Auth0 seed subjects together and distinct', () => {
    expect(() =>
      validateEnvironment({
        SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|synthetic-manager',
      }),
    ).toThrow('Configure both synthetic Auth0 seed subjects together.');

    expect(() =>
      validateEnvironment({
        SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|same-subject',
        SEED_AUDITOR_SUBJECT: 'auth0|same-subject',
      }),
    ).toThrow('Synthetic Auth0 seed subjects must be distinct.');
  });

  it('rejects local identity in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_MODE: 'local',
        ACCESS_STORE: 'prisma',
      }),
    ).toThrow('Production requires AUTH_MODE=oidc.');
  });

  it('rejects the in-memory directory in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_MODE: 'oidc',
        ACCESS_STORE: 'memory',
        OIDC_ISSUER: 'https://identity.example.test/',
        OIDC_AUDIENCE: 'https://api.example.test',
      }),
    ).toThrow('Production requires ACCESS_STORE=prisma.');
  });

  it('requires explicit database and web origins in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_MODE: 'oidc',
        ACCESS_STORE: 'prisma',
        OIDC_ISSUER: 'https://identity.example.test/',
        OIDC_AUDIENCE: 'https://api.example.test',
      }),
    ).toThrow('Production requires an explicit DATABASE_URL.');
  });

  it('rejects non-HTTPS production origins', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_MODE: 'oidc',
        ACCESS_STORE: 'prisma',
        DATABASE_URL: 'postgresql://keelwatch:secret@database.example.test/keelwatch',
        WEB_ORIGIN: 'http://app.example.test',
        OIDC_ISSUER: 'https://identity.example.test/',
        OIDC_AUDIENCE: 'https://api.example.test',
      }),
    ).toThrow('Production requires an HTTPS WEB_ORIGIN.');
  });

  it('accepts HTTPS, OIDC, and Prisma production without storage or scanner services', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_MODE: 'oidc',
        ACCESS_STORE: 'prisma',
        DATABASE_URL: 'postgresql://keelwatch:secret@database.internal/keelwatch',
        WEB_ORIGIN: 'https://keelwatch-web.example.test',
        OIDC_ISSUER: 'https://identity.example.test/',
        OIDC_AUDIENCE: 'https://api.example.test',
      }),
    ).toMatchObject({
      NODE_ENV: 'production',
      AUTH_MODE: 'oidc',
      ACCESS_STORE: 'prisma',
    });
  });
});
