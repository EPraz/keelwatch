import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiException } from '../../common/http/api-exception';
import type { Permission } from '../domain/access.types';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const actor = context.switchToHttp().getRequest<Request>().actor;
    const permitted =
      actor && required.every((permission) => actor.permissions.includes(permission));
    if (!permitted) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'PERMISSION_DENIED',
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
