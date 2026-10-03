import { Navigate } from 'react-router-dom';
import { useAuthSession } from '../auth/auth-context';

export function AuthCallbackPage() {
  const session = useAuthSession();
  if (session.status === 'authenticated') return <Navigate to="/app" replace />;

  return (
    <main className="system-page" aria-busy={session.status === 'loading'}>
      <section className="system-panel" role={session.message ? 'alert' : 'status'}>
        <p className="eyebrow">Identity callback</p>
        <h1>
          {session.message
            ? 'Sign-in could not be completed.'
            : 'Completing secure sign-in…'}
        </h1>
        {session.message ? <p>{session.message}</p> : null}
      </section>
    </main>
  );
}
