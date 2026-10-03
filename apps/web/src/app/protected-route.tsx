import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '../auth/auth-context';
import { rememberReturnTo } from './return-to';

export function ProtectedRoute() {
  const session = useAuthSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return (
      <main className="system-page" aria-busy="true">
        <section className="system-panel system-panel--loading">
          <span className="loading-mark" aria-hidden="true" />
          <p>Checking your watch credentials…</p>
        </section>
      </main>
    );
  }

  if (session.status !== 'authenticated') {
    const returnTo = `${location.pathname}${location.search}`;
    rememberReturnTo(returnTo);
    return <Navigate to="/sign-in" replace state={{ returnTo }} />;
  }

  return <Outlet />;
}
