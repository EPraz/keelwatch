import type { DemoAccessState, DemoRole } from './auth.types';

const ACCOUNTS = [
  {
    role: 'manager',
    name: 'Demo Manager',
    description:
      'Change shared synthetic records and review Activity. One-hour access, no password.',
  },
  {
    role: 'auditor',
    name: 'Demo Auditor',
    description:
      'Read shared synthetic records and Activity. One-hour access, no password.',
  },
] as const;

export function DemoAccessOptions({
  access,
  pending,
  openingRole,
  onSignIn,
}: {
  readonly access: DemoAccessState;
  readonly pending: boolean;
  readonly openingRole: DemoRole | null;
  readonly onSignIn: (role: DemoRole) => void;
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
  if (access.availableRoles.length === 0)
    return <p className="panel-footnote">Demo access is currently unavailable.</p>;
  return (
    <div className="identity-list demo-access-options">
      {ACCOUNTS.filter((account) => access.availableRoles.includes(account.role)).map(
        (account) => (
          <button
            key={account.role}
            className="identity-option"
            disabled={pending}
            onClick={() => onSignIn(account.role)}
          >
            <span className="identity-option__role">{account.name}</span>
            <span className="identity-option__description">{account.description}</span>
            <span className="identity-option__action">
              {openingRole === account.role ? 'Opening…' : 'Explore demo'}
            </span>
          </button>
        ),
      )}
      <p className="panel-footnote">
        Other visitors can change these records. Activity identifies a shared demo
        account, not each visitor.
      </p>
    </div>
  );
}
