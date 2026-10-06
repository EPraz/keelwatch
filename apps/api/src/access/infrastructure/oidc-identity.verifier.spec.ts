import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiException } from '../../common/http/api-exception';
import { OidcIdentityVerifier } from './oidc-identity.verifier';

describe('OidcIdentityVerifier', () => {
  const audience = 'https://api.keelwatch.example.test';
  const keyId = 'synthetic-test-key';
  let issuer: string;
  let privateKey: KeyLike;
  let jwksServer: Server;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256');
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);

    jwksServer = createServer((request, response) => {
      if (request.url !== '/.well-known/jwks.json') {
        response.writeHead(HttpStatus.NOT_FOUND).end();
        return;
      }

      response.writeHead(HttpStatus.OK, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          keys: [{ ...publicJwk, alg: 'RS256', kid: keyId, use: 'sig' }],
        }),
      );
    });
    jwksServer.listen(0, '127.0.0.1');
    await once(jwksServer, 'listening');

    const address = jwksServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('The synthetic JWKS server did not expose a TCP port.');
    }
    issuer = `http://127.0.0.1:${address.port}/`;
  });

  afterAll(async () => {
    jwksServer.close();
    await once(jwksServer, 'close');
  });

  function createVerifier(): OidcIdentityVerifier {
    return new OidcIdentityVerifier(
      new ConfigService({ OIDC_ISSUER: issuer, OIDC_AUDIENCE: audience }),
    );
  }

  async function signToken(expiresAt: number): Promise<string> {
    return new SignJWT({ sub: 'auth0|synthetic-verifier-user' })
      .setProtectedHeader({ alg: 'RS256', kid: keyId })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(expiresAt - 60)
      .setExpirationTime(expiresAt)
      .sign(privateKey);
  }

  it('accepts a valid token from the configured issuer and audience', async () => {
    const token = await signToken(Math.floor(Date.now() / 1000) + 60);

    await expect(createVerifier().verify(token)).resolves.toEqual({
      subject: 'auth0|synthetic-verifier-user',
    });
  });

  it('rejects an expired token with the stable safe error contract', async () => {
    const token = await signToken(Math.floor(Date.now() / 1000) - 1);

    try {
      await createVerifier().verify(token);
      throw new Error('Expected the expired token to be rejected.');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      const exception = error as ApiException;
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.getResponse()).toEqual({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'The access token is invalid or expired.',
      });
    }
  });
});
