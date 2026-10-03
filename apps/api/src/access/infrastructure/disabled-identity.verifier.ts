import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import type { ExternalIdentity } from '../domain/access.types';
import type { ExternalIdentityVerifier } from '../ports/external-identity.verifier';

@Injectable()
export class DisabledIdentityVerifier implements ExternalIdentityVerifier {
  verify(): Promise<ExternalIdentity> {
    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'AUTHENTICATION_NOT_CONFIGURED',
      'Authentication is not configured for this environment.',
    );
  }
}
