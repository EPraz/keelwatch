import { useMemo, type PropsWithChildren } from 'react';
import { AuthProvider as ReactOidcProvider, useAuth } from 'react-oidc-context';
import type { User } from 'oidc-client-ts';
import { AuthSessionContext } from './auth-context';
import type { AuthSession } from './auth.types';
import type { AuthConfiguration } from './auth.config';

type OidcConfiguration = Extract<AuthConfiguration, { mode: 'oidc' }>;

function OidcBridge({ children }: PropsWithChildren) {
  const oidc = useAuth();
  const session = useMemo<AuthSession>(
    () => ({
      status: oidc.isLoading
        ? 'loading'
        : oidc.isAuthenticated
          ? 'authenticated'
          : 'unauthenticated',
      mode: 'oidc',
      message: oidc.error?.message,
      signIn: async ({ returnTo }) => {
        await oidc.signinRedirect({ state: { returnTo } });
      },
      signOut: async () => {
        await oidc.signoutRedirect();
      },
      getAccessToken: () => Promise.resolve(oidc.user?.access_token ?? null),
    }),
    [oidc],
  );

  return (
    <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>
  );
}

export function OidcAuthProvider({
  children,
  configuration,
}: PropsWithChildren<{ readonly configuration: OidcConfiguration }>) {
  const redirectUri = `${window.location.origin}/auth/callback`;
  const onSigninCallback = (user: User | void) => {
    const state = user?.state as { returnTo?: string } | undefined;
    window.history.replaceState({}, document.title, state?.returnTo ?? '/app');
  };

  return (
    <ReactOidcProvider
      authority={configuration.authority}
      client_id={configuration.clientId}
      redirect_uri={redirectUri}
      post_logout_redirect_uri={`${window.location.origin}/sign-in`}
      scope="openid profile email"
      extraQueryParams={{ audience: configuration.audience }}
      onSigninCallback={onSigninCallback}
    >
      <OidcBridge>{children}</OidcBridge>
    </ReactOidcProvider>
  );
}
