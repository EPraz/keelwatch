export const ROLE_CODES = [
  'OPERATIONS_MANAGER',
  'COMPLIANCE_OFFICER',
  'AUDITOR',
  'PLATFORM_ADMINISTRATOR',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];
export type Permission =
  | 'fleet:read'
  | 'fleet:write'
  | 'crew:read'
  | 'crew:write'
  | 'maintenance:read'
  | 'maintenance:write'
  | 'activity:read'
  | 'access:manage';

export interface ExternalIdentity {
  readonly subject: string;
  readonly source?: 'demo';
}

export interface AccessUserRecord {
  readonly id: string;
  readonly externalSubject: string;
  readonly displayName: string;
  readonly email: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
  readonly roles: readonly RoleCode[];
}

export interface AccessActor {
  readonly userId: string;
  readonly externalSubject: string;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly Permission[];
}
