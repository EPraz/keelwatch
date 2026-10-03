import { Link, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { useVesselDetail } from './use-vessel-detail';
import { VesselEditForm } from './vessel-create-form';
import { VesselDetailFailure, VesselDetailLoading } from './vessel-detail-states';

function AuthorizedVesselEditPage({ vesselId }: { readonly vesselId: string }) {
  const detail = useVesselDetail(vesselId);
  if (detail.status === 'loading') return <VesselDetailLoading />;
  if (detail.status === 'error') {
    return (
      <VesselDetailFailure
        httpStatus={detail.httpStatus}
        error={detail.error}
        correlationId={detail.correlationId}
        onRetry={detail.retry}
      />
    );
  }

  return (
    <>
      <header className="page-heading page-heading--form">
        <div>
          <p className="eyebrow">Fleet / edit record</p>
          <h1>Edit vessel.</h1>
        </div>
        <p className="page-heading__meta">Atomic update + activity</p>
      </header>
      <section className="form-layout" aria-labelledby="vessel-edit-heading">
        <div className="form-layout__intro">
          <span className="form-layout__number" aria-hidden="true">
            03
          </span>
          <h2 id="vessel-edit-heading">Keep its identity current</h2>
          <p>
            Saved changes and the sanitized activity record commit together. A failed
            audit write rolls the vessel back.
          </p>
        </div>
        <VesselEditForm vessel={detail.vessel} />
      </section>
    </>
  );
}

export function VesselEditPage() {
  const { vesselId = '' } = useParams();
  const { user } = useAppShell();
  if (!user.permissions.includes('fleet:write')) {
    return (
      <section
        className="fleet-state fleet-state--forbidden"
        aria-labelledby="fleet-edit-heading"
      >
        <p className="eyebrow">Read-only watch</p>
        <h1 id="fleet-edit-heading">This role cannot edit vessels.</h1>
        <p>
          Auditors can review vessel details and activity, while the API reserves changes
          for roles with Fleet write permission.
        </p>
        <Link className="button button--secondary" to={`/app/vessels/${vesselId}`}>
          Return to vessel
        </Link>
      </section>
    );
  }

  return <AuthorizedVesselEditPage vesselId={vesselId} />;
}
