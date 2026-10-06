import { describe, expect, it } from 'vitest';
import { selectSeedUsers } from './seed-users.mjs';

const configuredSubjects = {
  SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|synthetic-manager',
  SEED_AUDITOR_SUBJECT: 'auth0|synthetic-auditor',
};

describe('selectSeedUsers', () => {
  it('keeps the three local identities when Auth0 subjects are absent in development', () => {
    const users = selectSeedUsers({ NODE_ENV: 'development' });

    expect(users.map(({ externalSubject }) => externalSubject)).toEqual([
      'local:operations-manager',
      'local:auditor',
      'local:inactive',
    ]);
  });

  it('adds both configured Auth0 identities in development', () => {
    const users = selectSeedUsers({
      NODE_ENV: 'development',
      ...configuredSubjects,
    });

    expect(users).toHaveLength(5);
    expect(users.slice(-2)).toMatchObject([
      {
        externalSubject: configuredSubjects.SEED_OPERATIONS_MANAGER_SUBJECT,
        roleCode: 'OPERATIONS_MANAGER',
      },
      {
        externalSubject: configuredSubjects.SEED_AUDITOR_SUBJECT,
        roleCode: 'AUDITOR',
      },
    ]);
  });

  it('requires configured Auth0 subjects together in development', () => {
    expect(() =>
      selectSeedUsers({
        NODE_ENV: 'development',
        SEED_OPERATIONS_MANAGER_SUBJECT:
          configuredSubjects.SEED_OPERATIONS_MANAGER_SUBJECT,
      }),
    ).toThrow('Configure both synthetic Auth0 subject values together.');
  });

  it('requires distinct configured Auth0 subjects', () => {
    expect(() =>
      selectSeedUsers({
        NODE_ENV: 'development',
        SEED_OPERATIONS_MANAGER_SUBJECT: 'auth0|same-subject',
        SEED_AUDITOR_SUBJECT: 'auth0|same-subject',
      }),
    ).toThrow('Configured synthetic Auth0 subjects must be distinct.');
  });

  it('requires both Auth0 subjects in production', () => {
    expect(() => selectSeedUsers({ NODE_ENV: 'production' })).toThrow(
      'Production seed requires both synthetic Auth0 demo-account subject values.',
    );
  });

  it('seeds only Auth0 identities in production with distinct synthetic emails', () => {
    const users = selectSeedUsers({
      NODE_ENV: 'production',
      ...configuredSubjects,
    });

    expect(users).toHaveLength(2);
    expect(users.map(({ externalSubject }) => externalSubject)).toEqual([
      configuredSubjects.SEED_OPERATIONS_MANAGER_SUBJECT,
      configuredSubjects.SEED_AUDITOR_SUBJECT,
    ]);
    expect(new Set(users.map(({ email }) => email))).toHaveProperty('size', 2);
  });
});
