import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { ApiException } from '../../common/http/api-exception';
import { DEMO_AUDITOR_SUBJECT, DEMO_TOKEN_PREFIX } from '../domain/demo-account';
import type { ExternalIdentity } from '../domain/access.types';
import { AccessService } from './access.service';

const ISSUER = 'urn:keelwatch:public-demo';
const AUDIENCE = 'urn:keelwatch:api:demo';
const SESSION_SECONDS = 3600;

@Injectable()
export class DemoSessions {
  constructor(
    private readonly config: ConfigService,
    private readonly access: AccessService,
  ) {}

  get enabled(): boolean {
    return this.config.get<boolean>('DEMO_ACCESS_ENABLED') === true;
  }

  async issue(role: 'auditor'): Promise<{ accessToken: string; expiresAt: string }> {
    if (role !== 'auditor') {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'DEMO_ROLE_INVALID',
        'Choose an available demo role.',
      );
    }
    if (!this.enabled) {
      throw new ApiException(403, 'DEMO_ACCESS_DISABLED', 'Demo access is unavailable.');
    }
    const user = await this.access.findByExternalSubject(DEMO_AUDITOR_SUBJECT);
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.roles.length !== 1 ||
      user.roles[0] !== 'AUDITOR'
    ) {
      throw new ApiException(
        403,
        'DEMO_ACCOUNT_UNAVAILABLE',
        'Demo Auditor is unavailable. Please try again later.',
      );
    }
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + SESSION_SECONDS;
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'kw-demo+jwt' })
      .setSubject(DEMO_AUDITOR_SUBJECT)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setJti(randomUUID())
      .setIssuedAt(now)
      .setExpirationTime(expiresAt)
      .sign(this.key());
    return {
      accessToken: `${DEMO_TOKEN_PREFIX}${token}`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  async verify(accessToken: string): Promise<ExternalIdentity> {
    try {
      if (!this.enabled || !accessToken.startsWith(DEMO_TOKEN_PREFIX))
        throw new Error('Demo access unavailable.');
      const { payload } = await jwtVerify(
        accessToken.slice(DEMO_TOKEN_PREFIX.length),
        this.key(),
        {
          issuer: ISSUER,
          audience: AUDIENCE,
          algorithms: ['HS256'],
          typ: 'kw-demo+jwt',
          requiredClaims: ['sub', 'iat', 'exp', 'jti'],
          maxTokenAge: SESSION_SECONDS,
        },
      );
      if (
        payload.sub !== DEMO_AUDITOR_SUBJECT ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number' ||
        payload.exp - payload.iat !== SESSION_SECONDS
      )
        throw new Error('Unexpected demo identity.');
      return { subject: payload.sub, source: 'demo' };
    } catch {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN',
        'The access token is invalid or expired.',
      );
    }
  }

  private key(): Uint8Array {
    return Buffer.from(
      this.config.getOrThrow<string>('DEMO_SESSION_SECRET'),
      'base64url',
    );
  }
}
