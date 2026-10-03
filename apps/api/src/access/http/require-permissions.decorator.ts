import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../domain/access.types';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...permissions: readonly Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
