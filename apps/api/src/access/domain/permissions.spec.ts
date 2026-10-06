import { describe, expect, it } from 'vitest';
import { permissionsForRoles } from './permissions';

describe('permissionsForRoles', () => {
  it('grants fleet writes to an Operations Manager', () => {
    expect(permissionsForRoles(['OPERATIONS_MANAGER'])).toContain('fleet:write');
  });

  it('keeps an Auditor read-only', () => {
    expect(permissionsForRoles(['AUDITOR'])).toEqual([
      'activity:read',
      'crew:read',
      'fleet:read',
    ]);
  });

  it('does not grant operational access to a Platform Administrator by default', () => {
    expect(permissionsForRoles(['PLATFORM_ADMINISTRATOR'])).toEqual(['access:manage']);
  });

  it('grants Crew writes only to the operational role, not through Fleet permission', () => {
    expect(permissionsForRoles(['OPERATIONS_MANAGER'])).toContain('crew:write');
    expect(permissionsForRoles(['COMPLIANCE_OFFICER'])).not.toContain('crew:write');
  });
});
