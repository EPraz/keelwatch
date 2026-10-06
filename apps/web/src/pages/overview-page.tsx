import { Link } from 'react-router-dom';
import { useAppShell } from '../app/app-shell-context';
import { OverviewCompliance } from '../features/compliance/overview-compliance';

export function OverviewPage() {
  const { user } = useAppShell();
  const roleLabel = user.roles.join(' · ').replaceAll('_', ' ');

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Operational overview</p>
          <h1>The protected workspace is on watch.</h1>
        </div>
        <p className="page-heading__meta">Identity resolved by the Keelwatch API</p>
      </header>

      <section className="status-banner" aria-labelledby="access-status-title">
        <div className="status-banner__marker" aria-hidden="true">
          01
        </div>
        <div>
          <p className="eyebrow">Access status</p>
          <h2 id="access-status-title">Active application identity</h2>
          <p>
            The server matched your external subject to an active Keelwatch user and
            resolved permissions from application-owned roles.
          </p>
        </div>
        <span className="status-pill">Verified</span>
      </section>

      <div className="overview-grid">
        <section className="data-panel" aria-labelledby="identity-heading">
          <div className="data-panel__heading">
            <p className="eyebrow">Current watch</p>
            <h2 id="identity-heading">Identity register</h2>
          </div>
          <dl className="identity-register">
            <div>
              <dt>Name</dt>
              <dd>{user.displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </section>

        <section
          className="data-panel data-panel--dark"
          aria-labelledby="permission-heading"
        >
          <div className="data-panel__heading">
            <p className="eyebrow">Server policy</p>
            <h2 id="permission-heading">Granted capabilities</h2>
          </div>
          <ul className="permission-list">
            {user.permissions.map((permission) => (
              <li key={permission}>{permission.replace(':', ' / ')}</li>
            ))}
          </ul>
        </section>
      </div>

      <OverviewCompliance />

      <section className="next-slice" aria-labelledby="fleet-ready-heading">
        <p className="eyebrow">Current vertical outcome</p>
        <h2 id="fleet-ready-heading">Documentary risks lead to concrete work.</h2>
        <p>
          Open the full watch to combine status and vessel filters, then inspect the
          evidence behind each result.
        </p>
        <Link className="button button--primary" to="/app/compliance">
          Open compliance watch
        </Link>
      </section>
    </>
  );
}
