import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiException } from '../../common/http/api-exception';
import { AccessService } from '../application/access.service';
import { permissionsForRoles } from '../domain/permissions';
import { hasFixedDemoRole } from '../domain/demo-account';
import {
  EXTERNAL_IDENTITY_VERIFIER,
  type ExternalIdentityVerifier,
} from '../ports/external-identity.verifier';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
    @Inject(EXTERNAL_IDENTITY_VERIFIER)
    private readonly identities: ExternalIdentityVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.readBearerToken(request);
    const identity = await this.identities.verify(accessToken);
    const user = await this.access.findByExternalSubject(identity.subject);

    if (!user) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'ACCESS_USER_NOT_PROVISIONED',
        'This identity does not have access to Keelwatch.',
      );
    }
    if (user.status !== 'ACTIVE') {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'ACCESS_USER_INACTIVE',
        'This Keelwatch account is inactive.',
      );
    }

    if (identity.source === 'demo' && !hasFixedDemoRole(user)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'DEMO_ACCOUNT_UNAVAILABLE',
        'The demo account is unavailable.',
      );
    }

    request.actor = {
      userId: user.id,
      externalSubject: user.externalSubject,
      displayName: user.displayName,
      email: user.email,
      roles: user.roles,
      permissions: permissionsForRoles(user.roles),
    };
    return true;
  }

  private readBearerToken(request: Request): string {
    const [scheme, token, ...unexpected] =
      request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token || unexpected.length > 0) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED',
        'A valid bearer access token is required.',
      );
    }
    return token;
  }
}
