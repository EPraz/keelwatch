import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/http/api-exception';
import type { ExternalIdentity } from '../domain/access.types';
import type { ExternalIdentityVerifier } from '../ports/external-identity.verifier';

const LOCAL_IDENTITIES: Readonly<Record<string, string>> = {
  'local.operations-manager': 'local:operations-manager',
  'local.auditor': 'local:auditor',
  'local.inactive': 'local:inactive',
};

@Injectable()
export class LocalIdentityVerifier implements ExternalIdentityVerifier {
  constructor(private readonly config: ConfigService) {}

  verify(accessToken: string): Promise<ExternalIdentity> {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new Error('The local identity adapter cannot run in production.');
    }

    const subject = LOCAL_IDENTITIES[accessToken];
    if (!subject) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN',
        'The access token is invalid or expired.',
      );
    }

    return Promise.resolve({ subject });
  }
}
