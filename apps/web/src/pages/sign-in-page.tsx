import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthSession } from '../auth/auth-context';
import { consumeReturnTo } from '../app/return-to';

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
  const routeState = location.state as { returnTo?: string } | null;

  if (session.status === 'authenticated')
    return <Navigate to={consumeReturnTo()} replace />;

  const signIn = async (localToken?: string) => {
    setPendingToken(localToken ?? 'oidc');
    const returnTo = routeState?.returnTo ?? consumeReturnTo();
    try {
      await session.signIn({ returnTo, localToken });
      if (session.mode === 'local') void navigate(returnTo, { replace: true });
    } finally {
      setPendingToken(null);
    }
  };

  return (
    <main className="sign-in-page">
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
            Access is resolved twice: the identity provider confirms who you are, and
            Keelwatch decides what that identity may do.
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

        {session.status === 'misconfigured' ? (
          <div className="inline-notice inline-notice--warning" role="status">
            <strong>Authentication setup required</strong>
            <span>{session.message}</span>
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
            className="button button--primary button--full"
            disabled={pendingToken !== null}
            onClick={() => void signIn()}
          >
            {pendingToken ? 'Redirecting…' : 'Continue with identity provider'}
          </button>
        )}
        <p className="panel-footnote">
          Local identities are available only in development and never bypass API
          authorization.
        </p>
      </section>
    </main>
  );
}
