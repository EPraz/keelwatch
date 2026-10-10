import { Toast } from '../../app/toast';
import { Link } from 'react-router-dom';
import type { ComplianceApiErrorBody } from './compliance.types';

export function ComplianceQueueLoading() {
  return (
    <section
      className="compliance-queue-loading"
      aria-busy="true"
      aria-label="Loading compliance watch"
    >
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </section>
  );
}

export function ComplianceQueueFailure({
  error,
  forbidden,
  onRetry,
}: {
  readonly error: ComplianceApiErrorBody;
  readonly forbidden: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <Toast role="alert">
      <p className="eyebrow">
        {forbidden ? 'Access restricted' : 'Connection interrupted'}
      </p>
      <h2>
        {forbidden
          ? 'Compliance is not available to this role.'
          : 'The compliance watch could not load.'}
      </h2>
      <p>{error.message}</p>
      {error.correlationId ? (
        <p className="correlation">Reference: {error.correlationId}</p>
      ) : null}
      {!forbidden ? (
        <button className="button button--primary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </Toast>
  );
}

export function ComplianceQueueEmpty({ filtered }: { readonly filtered: boolean }) {
  return (
    <section className="fleet-state" aria-labelledby="empty-compliance-heading">
      <span className="fleet-state__index" aria-hidden="true">
        00
      </span>
      <p className="eyebrow">No open results</p>
      <h2 id="empty-compliance-heading">
        {filtered ? 'No vessels match these filters.' : 'No active vessels to assess.'}
      </h2>
      <p>
        {filtered
          ? 'Clear or adjust the filters to return vessels to the watch.'
          : 'Register an active vessel in Fleet before reviewing documentary risk.'}
      </p>
      {filtered ? (
        <Link className="button button--secondary" to="/app/compliance">
          Clear filters
        </Link>
      ) : (
        <Link className="button button--primary" to="/app/vessels">
          Open Fleet
        </Link>
      )}
    </section>
  );
}
