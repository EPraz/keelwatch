import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAuthConfiguration } from './auth.config';

afterEach(() => vi.unstubAllEnvs());

function configureOidc(authority: string) {
  vi.stubEnv('VITE_AUTH_MODE', 'oidc');
  vi.stubEnv('VITE_OIDC_AUTHORITY', authority);
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'synthetic-client-id');
  vi.stubEnv('VITE_OIDC_AUDIENCE', 'https://api.example.test');
}

describe('getAuthConfiguration', () => {
  it('normalizes a secure OIDC authority', () => {
    configureOidc('https://identity.example.test');

    expect(getAuthConfiguration()).toMatchObject({
      mode: 'oidc',
      authority: 'https://identity.example.test/',
    });
  });

  it('disables OIDC when its authority is not HTTPS', () => {
    configureOidc('http://identity.example.test');

    expect(getAuthConfiguration()).toEqual({
      mode: 'disabled',
      message: 'OIDC authority must be a secure origin URL.',
    });
  });
});
