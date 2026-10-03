import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { ApiException } from '../../common/http/api-exception';
import type { ExternalIdentity } from '../domain/access.types';
import type { ExternalIdentityVerifier } from '../ports/external-identity.verifier';

@Injectable()
export class OidcIdentityVerifier implements ExternalIdentityVerifier {
  private keySet?: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService) {}

  async verify(accessToken: string): Promise<ExternalIdentity> {
    const issuer = this.config.get<string>('OIDC_ISSUER');
    const audience = this.config.get<string>('OIDC_AUDIENCE');
    if (!issuer || !audience) throw new Error('OIDC configuration is incomplete.');

    const normalizedIssuer = issuer.endsWith('/') ? issuer : `${issuer}/`;
    this.keySet ??= createRemoteJWKSet(
      new URL(`${normalizedIssuer}.well-known/jwks.json`),
    );

    try {
      const result = await jwtVerify(accessToken, this.keySet, {
        issuer: normalizedIssuer,
        audience,
        algorithms: ['RS256'],
      });
      if (!result.payload.sub) {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'INVALID_ACCESS_TOKEN',
          'The access token is missing a subject claim.',
        );
      }
      return { subject: result.payload.sub };
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new ApiException(
          HttpStatus.UNAUTHORIZED,
          'INVALID_ACCESS_TOKEN',
          'The access token is invalid or expired.',
        );
      }
      throw error;
    }
  }
}
