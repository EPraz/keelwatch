export type AuthStatus =
  'loading' | 'unauthenticated' | 'authenticated' | 'misconfigured';

export type DemoRole = 'manager' | 'auditor';

export interface SignInOptions {
  readonly returnTo: string;
  readonly localToken?: string;
  readonly demoRole?: DemoRole;
}

export interface DemoAccessState {
  readonly status: 'loading' | 'ready' | 'error';
  readonly availableRoles: readonly DemoRole[];
  readonly message?: string;
  reload(): void;
}

export interface AuthSession {
  readonly status: AuthStatus;
  readonly mode: 'disabled' | 'local' | 'oidc' | 'demo';
  readonly message?: string;
  readonly demoAccess?: DemoAccessState;
  signIn(options: SignInOptions): Promise<void>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}
