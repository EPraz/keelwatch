export type AuthStatus =
  'loading' | 'unauthenticated' | 'authenticated' | 'misconfigured';

export interface SignInOptions {
  readonly returnTo: string;
  readonly localToken?: string;
}

export interface AuthSession {
  readonly status: AuthStatus;
  readonly mode: 'disabled' | 'local' | 'oidc';
  readonly message?: string;
  signIn(options: SignInOptions): Promise<void>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}
