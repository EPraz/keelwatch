import type { ApiErrorResponse } from './current-user.types';

export function ShellLoading() {
  return (
    <main
      className="shell shell--loading"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="shell__rail" />
      <div className="shell__content">
        <div className="skeleton skeleton--short" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton-grid">
          <div className="skeleton skeleton--panel" />
          <div className="skeleton skeleton--panel" />
        </div>
      </div>
    </main>
  );
}

export function AccessFailure({
  error,
  forbidden,
  onRetry,
  onSignOut,
}: {
  readonly error: ApiErrorResponse;
  readonly forbidden: boolean;
  readonly onRetry: () => void;
  readonly onSignOut: () => void;
}) {
  return (
    <main className="system-page">
      <section className="system-panel" role="alert">
        <p className="eyebrow">
          {forbidden ? 'Access restricted' : 'Connection interrupted'}
        </p>
        <h1>
          {forbidden
            ? 'This account cannot enter the workspace.'
            : 'The watch could not open.'}
        </h1>
        <p>{error.message}</p>
        {error.correlationId ? (
          <p className="correlation">Reference: {error.correlationId}</p>
        ) : null}
        <div className="button-row">
          {!forbidden ? (
            <button className="button button--primary" onClick={onRetry}>
              Try again
            </button>
          ) : null}
          <button className="button button--secondary" onClick={onSignOut}>
            Return to sign in
          </button>
        </div>
      </section>
    </main>
  );
}
