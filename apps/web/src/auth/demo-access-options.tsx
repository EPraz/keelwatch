import type { DemoAccessState } from './auth.types';

export function DemoAccessOptions({
  access,
  pending,
  opening,
  onSignIn,
}: {
  readonly access: DemoAccessState;
  readonly pending: boolean;
  readonly opening: boolean;
  readonly onSignIn: () => void;
}) {
  if (access.status === 'loading')
    return (
      <p className="panel-footnote" role="status">
        Checking demo access…
      </p>
    );
  if (access.status === 'error')
    return (
      <p className="panel-footnote" role="status">
        Demo access could not be checked.{' '}
        <button
          className="button button--quiet"
          onClick={() => access.reload()}
          disabled={pending}
        >
          Try again
        </button>
      </p>
    );
  if (!access.availableRoles.includes('auditor'))
    return <p className="panel-footnote">Demo access is currently unavailable.</p>;
  return (
    <div className="identity-list demo-access-options">
      <button className="identity-option" disabled={pending} onClick={onSignIn}>
        <span className="identity-option__role">Demo Auditor</span>
        <span className="identity-option__description">
          Read shared synthetic records and Activity. One-hour access, no password.
        </span>
        <span className="identity-option__action">
          {opening ? 'Opening…' : 'Explore demo'}
        </span>
      </button>
      <p className="panel-footnote">
        Other visitors can change these records. Activity identifies a shared demo
        account, not each visitor.
      </p>
    </div>
  );
}
