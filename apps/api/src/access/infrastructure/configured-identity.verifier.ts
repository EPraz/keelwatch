import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../../common/http/api-exception';
import { DemoSessions } from '../application/demo-sessions';
import { DEMO_TOKEN_PREFIX, isDemoSubject } from '../domain/demo-account';
import type { ExternalIdentity } from '../domain/access.types';
import type { ExternalIdentityVerifier } from '../ports/external-identity.verifier';
import { DisabledIdentityVerifier } from './disabled-identity.verifier';
import { LocalIdentityVerifier } from './local-identity.verifier';
import { OidcIdentityVerifier } from './oidc-identity.verifier';

@Injectable()
export class ConfiguredIdentityVerifier implements ExternalIdentityVerifier {
  constructor(
    private readonly config: ConfigService,
    private readonly local: LocalIdentityVerifier,
    private readonly oidc: OidcIdentityVerifier,
    private readonly disabled: DisabledIdentityVerifier,
    private readonly demo: DemoSessions,
  ) {}

  async verify(accessToken: string): Promise<ExternalIdentity> {
    if (accessToken.startsWith(DEMO_TOKEN_PREFIX)) return this.demo.verify(accessToken);
    const mode = this.config.get<string>('AUTH_MODE');
    const verifier =
      mode === 'oidc' ? this.oidc : mode === 'local' ? this.local : this.disabled;
    const identity = await verifier.verify(accessToken);
    if (isDemoSubject(identity.subject)) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN',
        'The access token is invalid or expired.',
      );
    }
    return identity;
  }
}
