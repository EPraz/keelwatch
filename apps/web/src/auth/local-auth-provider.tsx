import { useState, type PropsWithChildren } from 'react';
import { AuthSessionContext } from './auth-context';
import type { AuthSession, SignInOptions } from './auth.types';

const LOCAL_TOKEN_KEY = 'keelwatch.local-access-token';

export function LocalAuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState(() =>
    sessionStorage.getItem(LOCAL_TOKEN_KEY),
  );

  const session: AuthSession = {
    status: accessToken ? 'authenticated' : 'unauthenticated',
    mode: 'local',
    signIn(options: SignInOptions) {
      if (!options.localToken) throw new Error('Select a synthetic local identity.');
      sessionStorage.setItem(LOCAL_TOKEN_KEY, options.localToken);
      setAccessToken(options.localToken);
      return Promise.resolve();
    },
    signOut() {
      sessionStorage.removeItem(LOCAL_TOKEN_KEY);
      setAccessToken(null);
      return Promise.resolve();
    },
    getAccessToken: () => Promise.resolve(accessToken),
  };

  return (
    <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>
  );
}
