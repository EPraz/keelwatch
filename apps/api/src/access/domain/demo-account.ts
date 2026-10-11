export const DEMO_AUDITOR_SUBJECT = 'demo:auditor';
export const DEMO_TOKEN_PREFIX = 'demo.';

export function hasOnlyAuditorRole(roles: readonly RoleCode[]): boolean {
  return roles.length === 1 && roles[0] === 'AUDITOR';
}

export function isDemoSubject(subject: string): boolean {
  return subject.startsWith('demo:');
}
import type { RoleCode } from './access.types';
