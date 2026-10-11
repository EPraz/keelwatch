export const roles = [
  { code: 'OPERATIONS_MANAGER', name: 'Operations Manager' },
  { code: 'AUDITOR', name: 'Auditor' },
];

const localUsers = [
  {
    externalSubject: 'local:operations-manager',
    displayName: 'Morgan Reed',
    email: 'morgan.reed@example.test',
    status: 'ACTIVE',
    roleCode: 'OPERATIONS_MANAGER',
  },
  {
    externalSubject: 'local:auditor',
    displayName: 'Avery Chen',
    email: 'avery.chen@example.test',
    status: 'ACTIVE',
    roleCode: 'AUDITOR',
  },
  {
    externalSubject: 'local:inactive',
    displayName: 'Inactive Demo User',
    email: 'inactive.user@example.test',
    status: 'INACTIVE',
    roleCode: 'AUDITOR',
  },
];

function configuredOidcUsers(environment) {
  const operationsManagerSubject = environment.SEED_OPERATIONS_MANAGER_SUBJECT?.trim();
  const auditorSubject = environment.SEED_AUDITOR_SUBJECT?.trim();
  if (!operationsManagerSubject && !auditorSubject) return [];
  if (!operationsManagerSubject || !auditorSubject) {
    throw new Error('Configure both synthetic Auth0 subject values together.');
  }
  if (operationsManagerSubject === auditorSubject) {
    throw new Error('Configured synthetic Auth0 subjects must be distinct.');
  }

  return [
    {
      externalSubject: operationsManagerSubject,
      displayName: 'Morgan Reed',
      email: 'morgan.auth0@example.test',
      status: 'ACTIVE',
      roleCode: 'OPERATIONS_MANAGER',
    },
    {
      externalSubject: auditorSubject,
      displayName: 'Avery Chen',
      email: 'avery.auth0@example.test',
      status: 'ACTIVE',
      roleCode: 'AUDITOR',
    },
  ];
}

export function selectSeedUsers(environment) {
  const oidcUsers = configuredOidcUsers(environment);
  const demoUsers =
    environment.DEMO_ACCESS_ENABLED === 'true'
      ? [
          {
            externalSubject: 'demo:auditor',
            displayName: 'Demo Auditor',
            email: 'demo.auditor@example.test',
            status: 'ACTIVE',
            roleCode: 'AUDITOR',
          },
        ]
      : [];
  if (environment.NODE_ENV === 'production') {
    if (oidcUsers.length === 0) {
      throw new Error(
        'Production seed requires both synthetic Auth0 demo-account subject values.',
      );
    }
    return [...oidcUsers, ...demoUsers];
  }

  return [...localUsers, ...oidcUsers, ...demoUsers];
}
