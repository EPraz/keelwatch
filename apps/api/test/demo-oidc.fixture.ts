import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { once } from 'node:events';
import { createServer } from 'node:http';

export async function createDemoOidcFixture() {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keyId = 'synthetic-demo-coexistence';
  const audience = 'https://api.keelwatch.example.test';
  const server = createServer((request, response) => {
    if (request.url !== '/.well-known/jwks.json') {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ keys: [{ ...jwk, alg: 'RS256', kid: keyId, use: 'sig' }] }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Synthetic JWKS fixture unavailable.');
  const issuer = `http://127.0.0.1:${address.port}/`;
  return {
    issuer,
    audience,
    token: (subject = 'auth0|synthetic-demo-test-auditor') =>
      new SignJWT({})
        .setSubject(subject)
        .setProtectedHeader({ alg: 'RS256', kid: keyId })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
