import { Toast } from '../../app/toast';
import { Link } from 'react-router-dom';
import { useComplianceQueue } from './use-compliance-queue';

export function OverviewCompliance() {
  const queue = useComplianceQueue({ page: 1, pageSize: 3 });

  if (queue.status === 'loading') {
    return (
      <section className="overview-compliance overview-compliance--loading" aria-busy>
        <span className="visually-hidden">Loading documentary risks…</span>
        <div className="skeleton skeleton--row" />
      </section>
    );
  }
  if (queue.status === 'error') {
    return (
      <Toast role="alert">
        <p className="eyebrow">Documentary risk</p>
        <h2>Compliance summary could not load.</h2>
        <p>{queue.error.message}</p>
        {queue.error.correlationId ? (
          <p className="correlation">Reference: {queue.error.correlationId}</p>
        ) : null}
        <button className="button button--secondary" onClick={queue.retry}>
          Try again
        </button>
      </Toast>
    );
  }

  const { counts, items } = queue.page;
  const attention = counts.MISSING + counts.EXPIRED + counts.EXPIRING_SOON;
  const actions = items.filter((item) => item.status !== 'VALID');
  return (
    <section className="overview-compliance" aria-labelledby="overview-risk-heading">
      <div className="overview-compliance__heading">
        <div>
          <p className="eyebrow">Documentary risk</p>
          <h2 id="overview-risk-heading">
            {attention === 0
              ? 'Documentary watch is clear.'
              : `${attention} ${attention === 1 ? 'vessel needs' : 'vessels need'} attention.`}
          </h2>
        </div>
        <p>Derived {queue.page.asOf} UTC</p>
      </div>

      <nav className="overview-risk-counts" aria-label="Filtered compliance risks">
        <Link to="/app/compliance?status=MISSING">
          <strong>{counts.MISSING}</strong>
          Missing
        </Link>
        <Link to="/app/compliance?status=EXPIRED">
          <strong>{counts.EXPIRED}</strong>
          Expired
        </Link>
        <Link to="/app/compliance?status=EXPIRING_SOON">
          <strong>{counts.EXPIRING_SOON}</strong>
          Due soon
        </Link>
      </nav>

      <div className="overview-actions">
        <div className="overview-actions__heading">
          <h3>Next actions</h3>
          <Link to="/app/compliance">Open compliance watch</Link>
        </div>
        {actions.length === 0 ? (
          <p className="overview-actions__empty">
            No immediate documentary action is due across the active fleet.
          </p>
        ) : (
          <ol>
            {actions.map((item) => (
              <li key={item.vessel.id}>
                <span className="activity-marker" aria-hidden="true" />
                <div>
                  <Link to={`/app/vessels/${item.vessel.id}`}>{item.vessel.name}</Link>
                  <p>{item.reason}</p>
                </div>
                <span className="compliance-status" data-status={item.status}>
                  {item.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
