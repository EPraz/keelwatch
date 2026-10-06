export type AuthConfiguration =
  | { readonly mode: 'disabled'; readonly message: string }
  | { readonly mode: 'local' }
  | {
      readonly mode: 'oidc';
      readonly authority: string;
      readonly clientId: string;
      readonly audience: string;
    };

function normalizeSecureAuthority(value: string): string | null {
  try {
    const authority = new URL(value);
    if (
      authority.protocol !== 'https:' ||
      authority.username ||
      authority.password ||
      authority.pathname !== '/' ||
      authority.search ||
      authority.hash
    ) {
      return null;
    }
    return authority.toString();
  } catch {
    return null;
  }
}

export function getAuthConfiguration(): AuthConfiguration {
  const mode = import.meta.env.VITE_AUTH_MODE ?? 'disabled';
  if (mode === 'local') {
    return import.meta.env.PROD
      ? {
          mode: 'disabled',
          message: 'The local identity adapter is disabled in production builds.',
        }
      : { mode: 'local' };
  }

  if (mode === 'oidc') {
    const authority = import.meta.env.VITE_OIDC_AUTHORITY;
    const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
    const audience = import.meta.env.VITE_OIDC_AUDIENCE;
    if (!authority || !clientId || !audience) {
      return {
        mode: 'disabled',
        message: 'OIDC is selected but its public configuration is incomplete.',
      };
    }
    const normalizedAuthority = normalizeSecureAuthority(authority);
    if (!normalizedAuthority) {
      return {
        mode: 'disabled',
        message: 'OIDC authority must be a secure origin URL.',
      };
    }
    return { mode, authority: normalizedAuthority, clientId, audience };
  }

  return {
    mode: 'disabled',
    message: 'Authentication has not been configured for this environment.',
  };
}
