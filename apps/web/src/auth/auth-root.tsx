import type { PropsWithChildren } from 'react';
import { getAuthConfiguration } from './auth.config';
import { AuthSessionContext } from './auth-context';
import { LocalAuthProvider } from './local-auth-provider';
import { OidcAuthProvider } from './oidc-auth-provider';

export function AuthRoot({ children }: PropsWithChildren) {
  const configuration = getAuthConfiguration();
  if (configuration.mode === 'local')
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  if (configuration.mode === 'oidc') {
    return <OidcAuthProvider configuration={configuration}>{children}</OidcAuthProvider>;
  }

  return (
    <AuthSessionContext.Provider
      value={{
        status: 'misconfigured',
        mode: 'disabled',
        message: configuration.message,
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        getAccessToken: () => Promise.resolve(null),
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}
