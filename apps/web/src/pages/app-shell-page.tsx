import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AccessFailure, ShellLoading } from '../access/access-states';
import { useCurrentUser } from '../access/use-current-user';
import { useAuthSession } from '../auth/auth-context';

const ROLE_LABELS: Readonly<Record<string, string>> = {
  OPERATIONS_MANAGER: 'Operations Manager',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  AUDITOR: 'Auditor',
  PLATFORM_ADMINISTRATOR: 'Platform Administrator',
};

function navigationClass({ isActive }: { readonly isActive: boolean }): string {
  return `nav-link${isActive ? ' nav-link--active' : ''}`;
}

export function AppShellPage() {
  const session = useAuthSession();
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  const signOut = async () => {
    await session.signOut();
    void navigate('/sign-in', { replace: true });
  };

  if (currentUser.status === 'loading') return <ShellLoading />;
  if (currentUser.status === 'error') {
    return (
      <AccessFailure
        error={currentUser.error}
        forbidden={currentUser.httpStatus === 403}
        onRetry={currentUser.retry}
        onSignOut={() => void signOut()}
      />
    );
  }

  const { user } = currentUser;
  const roleLabel = user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ');

  return (
    <div className="shell">
      <header className="shell__header">
        <NavLink
          className="brand brand--compact"
          to="/app"
          aria-label="Keelwatch workspace"
        >
          <span className="brand__mark" aria-hidden="true">
            K
          </span>
          <span>Keelwatch</span>
        </NavLink>
        <div className="watch-state" aria-label="System status">
          <span className="watch-state__signal" aria-hidden="true" />
          Watch active
        </div>
        <div className="account-summary">
          <span>
            <strong>{user.displayName}</strong>
            <small>{roleLabel}</small>
          </span>
          <button className="button button--quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <aside className="shell__rail" aria-label="Primary navigation">
        <nav>
          <NavLink className={navigationClass} to="/app" end>
            <span className="nav-link__index">01</span>
            Overview
          </NavLink>
          <NavLink className={navigationClass} to="/app/vessels">
            <span className="nav-link__index">02</span>
            Fleet
          </NavLink>
          <NavLink className={navigationClass} to="/app/compliance">
            <span className="nav-link__index">03</span>
            Compliance
          </NavLink>
        </nav>
        <p className="rail-note">Only implemented modules appear in this navigation.</p>
      </aside>

      <main className="shell__content" id="main-content">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
