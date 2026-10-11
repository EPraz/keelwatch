import type { AccessUserRecord } from './access.types';

export const DEMO_AUDITOR_SUBJECT = 'demo:auditor';
export const DEMO_MANAGER_SUBJECT = 'demo:manager';
export const DEMO_TOKEN_PREFIX = 'demo.';
export const DEMO_ROLES = ['manager', 'auditor'] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

const ACCOUNTS = {
  auditor: { subject: DEMO_AUDITOR_SUBJECT, role: 'AUDITOR', name: 'Demo Auditor' },
  manager: {
    subject: DEMO_MANAGER_SUBJECT,
    role: 'OPERATIONS_MANAGER',
    name: 'Demo Manager',
  },
} as const;

export function demoAccountForRole(role: string) {
  return role === 'auditor'
    ? ACCOUNTS.auditor
    : role === 'manager'
      ? ACCOUNTS.manager
      : null;
}

export function demoAccountForSubject(subject: string) {
  return Object.values(ACCOUNTS).find((account) => account.subject === subject);
}

export function hasFixedDemoRole(
  user: Pick<AccessUserRecord, 'externalSubject' | 'roles'>,
): boolean {
  const account = demoAccountForSubject(user.externalSubject);
  return (
    account !== undefined && user.roles.length === 1 && user.roles[0] === account.role
  );
}

export function isDemoSubject(subject: string): boolean {
  return subject.startsWith('demo:');
}
