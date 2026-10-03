import { Link } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { VesselCreateForm } from './vessel-create-form';

export function VesselCreatePage() {
  const { user } = useAppShell();
  const canCreate = user.permissions.includes('fleet:write');

  if (!canCreate) {
    return (
      <section
        className="fleet-state fleet-state--forbidden"
        aria-labelledby="fleet-write-heading"
      >
        <p className="eyebrow">Read-only watch</p>
        <h1 id="fleet-write-heading">This role cannot register vessels.</h1>
        <p>
          Auditors can review the Fleet register, while the API reserves changes for roles
          with Fleet write permission.
        </p>
        <Link className="button button--secondary" to="/app/vessels">
          Return to Fleet
        </Link>
      </section>
    );
  }

  return (
    <>
      <header className="page-heading page-heading--form">
        <div>
          <p className="eyebrow">Fleet / new record</p>
          <h1>Register a vessel.</h1>
        </div>
        <p className="page-heading__meta">Synthetic data only</p>
      </header>
      <section className="form-layout" aria-labelledby="vessel-form-heading">
        <div className="form-layout__intro">
          <span className="form-layout__number" aria-hidden="true">
            02
          </span>
          <h2 id="vessel-form-heading">Establish its Fleet identity</h2>
          <p>
            The API normalizes the registry number, protects uniqueness, and records the
            creation with your application identity in one transaction.
          </p>
        </div>
        <VesselCreateForm />
      </section>
    </>
  );
}
