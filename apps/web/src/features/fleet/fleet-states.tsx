import { Link } from 'react-router-dom';
import type { FleetApiErrorBody } from './fleet.types';

export function FleetLoading() {
  return (
    <section className="fleet-loading" aria-busy="true" aria-label="Loading vessels">
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </section>
  );
}

export function FleetFailure({
  error,
  forbidden,
  onRetry,
}: {
  readonly error: FleetApiErrorBody;
  readonly forbidden: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <section className="fleet-state fleet-state--error" role="alert">
      <p className="eyebrow">
        {forbidden ? 'Access restricted' : 'Connection interrupted'}
      </p>
      <h2>
        {forbidden
          ? 'Fleet is not available to this role.'
          : 'The Fleet register could not load.'}
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
    </section>
  );
}

export function FleetEmpty({ canCreate }: { readonly canCreate: boolean }) {
  return (
    <section
      className="fleet-state fleet-state--empty"
      aria-labelledby="empty-fleet-heading"
    >
      <span className="fleet-state__index" aria-hidden="true">
        00
      </span>
      <p className="eyebrow">Clear register</p>
      <h2 id="empty-fleet-heading">No vessels are on watch yet.</h2>
      <p>
        {canCreate
          ? 'Register the first synthetic vessel to establish the Fleet record.'
          : 'An Operations Manager can register the first synthetic vessel.'}
      </p>
      {canCreate ? (
        <Link className="button button--primary" to="/app/vessels/new">
          Register vessel
        </Link>
      ) : null}
    </section>
  );
}
