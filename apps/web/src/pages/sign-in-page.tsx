import { useState } from 'react';
import { Toast } from '../app/toast';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../auth/auth-context';
import { consumeReturnTo } from '../app/return-to';
import { DemoAccessOptions } from '../auth/demo-access-options';
import { DemoApiError } from '../auth/demo.api';

const DEMO_IDENTITIES = [
  {
    token: 'local.operations-manager',
    role: 'Operations Manager',
    description: 'Maintains operational records and can perform Fleet writes.',
  },
  {
    token: 'local.auditor',
    role: 'Auditor',
    description: 'Reviews records with read-only operational access.',
  },
  {
    token: 'local.inactive',
    role: 'Inactive user',
    description: 'Exercises the server-enforced inactive-account boundary.',
  },
] as const;

export function SignInPage() {
  const session = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<{
    message: string;
    demo: boolean;
  } | null>(null);
  const routeState = location.state as { returnTo?: string } | null;

  if (session.status === 'authenticated')
    return <Navigate to={consumeReturnTo()} replace />;

  const signIn = async (localToken?: string, demoRole?: 'auditor') => {
    setPendingToken(demoRole ?? localToken ?? 'oidc');
    setSignInError(null);
    const returnTo = routeState?.returnTo ?? consumeReturnTo();
    try {
      await session.signIn({ returnTo, localToken, ...(demoRole ? { demoRole } : {}) });
      if (session.mode === 'local' || demoRole)
        void navigate(returnTo, { replace: true });
    } catch (error) {
      setSignInError({
        message:
          error instanceof DemoApiError
            ? error.message
            : 'Sign-in could not start. Please try again.',
        demo: Boolean(demoRole),
      });
    } finally {
      setPendingToken(null);
    }
  };

  return (
    <main className="sign-in-page">
      {signInError ? (
        <Toast role="alert">
          {signInError.message}
          {signInError.demo ? (
            <button
              className="button button--quiet"
              disabled={pendingToken !== null}
              onClick={() => void signIn(undefined, 'auditor')}
            >
              Try demo again
            </button>
          ) : null}
        </Toast>
      ) : null}
      {!signInError && session.message && session.status === 'unauthenticated' ? (
        <Toast role="alert">{session.message}</Toast>
      ) : null}
      <section className="sign-in-intro" aria-labelledby="sign-in-title">
        <a className="brand" href="/" aria-label="Keelwatch home">
          <span className="brand__mark" aria-hidden="true">
            K
          </span>
          <span>Keelwatch</span>
        </a>
        <div>
          <p className="eyebrow">Maritime operations workspace</p>
          <h1 id="sign-in-title">Begin the watch with a verified identity.</h1>
          <p className="lede">
            Explore the synthetic workspace with a shared demo account, or sign in with
            your identity provider. Keelwatch controls what each account may do.
          </p>
        </div>
        <p className="clean-room-note">
          Independent portfolio project · Synthetic data only
        </p>
      </section>

      <section className="sign-in-panel" aria-labelledby="access-heading">
        <div className="panel-heading">
          <p className="eyebrow">Protected access</p>
          <h2 id="access-heading">
            {session.mode === 'local'
              ? 'Choose a local demo identity'
              : 'Sign in to Keelwatch'}
          </h2>
        </div>

        {session.demoAccess ? (
          <DemoAccessOptions
            access={session.demoAccess}
            pending={pendingToken !== null}
            opening={pendingToken === 'auditor'}
            onSignIn={() => void signIn(undefined, 'auditor')}
          />
        ) : null}

        {session.status === 'misconfigured' ? (
          <div className="inline-notice inline-notice--warning" role="status">
            <strong>Authentication setup required</strong>
            <span>{session.message}</span>
            {session.mode === 'demo' ? (
              <button
                className="button button--quiet"
                onClick={() => void session.signOut()}
              >
                Sign out
              </button>
            ) : null}
          </div>
        ) : session.mode === 'local' ? (
          <div className="identity-list">
            {DEMO_IDENTITIES.map((identity) => (
              <button
                className="identity-option"
                disabled={pendingToken !== null}
                key={identity.token}
                onClick={() => void signIn(identity.token)}
              >
                <span className="identity-option__role">{identity.role}</span>
                <span className="identity-option__description">
                  {identity.description}
                </span>
                <span className="identity-option__action">
                  {pendingToken === identity.token ? 'Opening…' : 'Continue'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            className="button button--secondary button--full"
            disabled={pendingToken !== null}
            onClick={() => void signIn()}
          >
            {pendingToken === 'oidc' ? 'Redirecting…' : 'Continue with identity provider'}
          </button>
        )}
        <p className="panel-footnote">
          {session.mode === 'local'
            ? 'Local identities are available only in development.'
            : 'Use your identity provider for your existing Keelwatch account.'}
        </p>
      </section>
    </main>
  );
}
