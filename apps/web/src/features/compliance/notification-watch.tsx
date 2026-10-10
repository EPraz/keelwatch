import { Toast } from '../../app/toast';
import { Link } from 'react-router-dom';
import { useNotificationWatch } from './use-notification-watch';

export function NotificationWatch({ canRun }: { readonly canRun: boolean }) {
  const notifications = useNotificationWatch();
  const { state, lastRun } = notifications;

  return (
    <section className="notification-watch" aria-labelledby="notification-watch-heading">
      <div className="notification-watch__heading">
        <div>
          <p className="eyebrow">Demo delivery log</p>
          <h2 id="notification-watch-heading">Expiry notifications</h2>
          <p>
            A bounded background check reconciles current risks without duplicating active
            notifications.
          </p>
        </div>
        {canRun ? (
          <button
            className="button button--primary"
            type="button"
            disabled={notifications.running}
            onClick={() => void notifications.runJob()}
          >
            {notifications.running ? 'Checking…' : 'Run expiry check'}
          </button>
        ) : (
          <p className="page-heading__meta">Read-only delivery log</p>
        )}
      </div>

      {lastRun ? (
        <Toast key={lastRun.id} role={lastRun.status === 'FAILED' ? 'alert' : 'status'}>
          {lastRun.status === 'FAILED' ? (
            <p>
              The check failed safely. Reference code:{' '}
              <strong>{lastRun.failureCode ?? 'NOTIFICATION_JOB_FAILED'}</strong>
            </p>
          ) : (
            <p>
              Check complete: <strong>{lastRun.createdCount} new</strong>,{' '}
              {lastRun.skippedCount} unchanged, {lastRun.resolvedCount} resolved.
            </p>
          )}
        </Toast>
      ) : null}

      {state.status === 'loading' ? (
        <div className="notification-watch__state" aria-busy="true">
          Loading notification watch…
        </div>
      ) : null}
      {state.status === 'error' ? (
        <Toast role="alert">
          <p>{state.error.message}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void notifications.retry()}
          >
            Try again
          </button>
        </Toast>
      ) : null}
      {state.status === 'success' && state.watch.items.length === 0 ? (
        <p className="notification-watch__state">
          No active notifications. The next check will create only conditions that need
          attention.
        </p>
      ) : null}
      {state.status === 'success' && state.watch.items.length > 0 ? (
        <ol className="notification-list">
          {state.watch.items.map((item) => (
            <li key={item.id}>
              <span className="activity-marker" aria-hidden="true" />
              <div>
                <Link to={`/app/vessels/${item.vesselId}`}>{item.vesselName}</Link>
                <p>{item.reason}</p>
                <small>
                  {item.registryNumber} · {item.certificateTypeName} · as of {item.asOf}
                </small>
              </div>
              <span className="compliance-status" data-status={item.status}>
                {item.status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
