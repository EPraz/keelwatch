import type { Permission, RoleCode } from './access.types';

const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly Permission[]>> = {
  OPERATIONS_MANAGER: ['fleet:read', 'fleet:write', 'activity:read'],
  COMPLIANCE_OFFICER: ['fleet:read', 'fleet:write', 'activity:read'],
  AUDITOR: ['fleet:read', 'activity:read'],
  PLATFORM_ADMINISTRATOR: ['access:manage'],
};

export function permissionsForRoles(roles: readonly RoleCode[]): readonly Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))].sort();
}
