import { Link } from 'react-router-dom';
import type { MaintenanceApiError } from './maintenance.api';

export function MaintenanceFailure({
  error,
  onRetry,
  history = false,
}: {
  error: MaintenanceApiError;
  onRetry: () => void;
  history?: boolean;
}) {
  const resource = history ? 'History' : 'Maintenance';
  return (
    <div role="alert" className="form-error">
      <p>
        <strong>
          {error.status === 403
            ? `${resource} access denied.`
            : error.status === 404
              ? `${resource} record not found.`
              : `${resource} unavailable.`}
        </strong>{' '}
        {error.message}
      </p>
      {error.correlationId ? <p>Error reference: {error.correlationId}</p> : null}
      {error.status === 401 ? <Link to="/sign-in">Sign in again</Link> : null}
      {error.status === 0 || error.status >= 500 ? (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          {history ? 'Retry history read' : 'Retry maintenance read'}
        </button>
      ) : null}
    </div>
  );
}
