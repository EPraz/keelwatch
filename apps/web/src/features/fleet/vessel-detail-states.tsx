import { Link } from 'react-router-dom';

export function VesselDetailLoading() {
  return (
    <section
      className="fleet-loading"
      aria-label="Loading vessel detail"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading vessel detail…</span>
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </section>
  );
}

export function VesselDetailFailure({
  httpStatus,
  error,
  correlationId,
  onRetry,
}: {
  readonly httpStatus?: number;
  readonly error: string;
  readonly correlationId?: string;
  readonly onRetry: () => void;
}) {
  if (httpStatus === 404) {
    return (
      <section
        className="fleet-state fleet-state--error"
        aria-labelledby="missing-vessel"
      >
        <p className="eyebrow">Off the register</p>
        <h1 id="missing-vessel">Vessel not found.</h1>
        <p>The link may be outdated, or this synthetic vessel no longer exists.</p>
        <Link className="button button--secondary" to="/app/vessels">
          Return to Fleet
        </Link>
      </section>
    );
  }

  const forbidden = httpStatus === 403;
  return (
    <section
      className={`fleet-state ${forbidden ? 'fleet-state--forbidden' : 'fleet-state--error'}`}
      role="alert"
      aria-labelledby="vessel-detail-error"
    >
      <p className="eyebrow">
        {forbidden ? 'Access boundary' : 'Connection interrupted'}
      </p>
      <h1 id="vessel-detail-error">
        {forbidden ? 'Vessel access denied.' : 'This vessel could not load.'}
      </h1>
      <p>{error}</p>
      {correlationId ? <p className="correlation">Reference: {correlationId}</p> : null}
      {forbidden ? (
        <Link className="button button--secondary" to="/app/vessels">
          Return to Fleet
        </Link>
      ) : (
        <button className="button button--primary" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}
