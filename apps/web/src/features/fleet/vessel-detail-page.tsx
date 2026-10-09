import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { VesselCompliance } from '../compliance/vessel-compliance';
import { VesselAssignments } from '../crew/vessel-assignments';
import { VesselMaintenance } from '../maintenance/vessel-maintenance';
import { VesselActivityPanel } from './vessel-activity';
import { formattedDateTime } from './fleet-date';
import { useVesselDetail } from './use-vessel-detail';
import { VesselDetailFailure, VesselDetailLoading } from './vessel-detail-states';

function updatedRegistryFromState(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'updatedRegistryNumber' in state &&
    typeof state.updatedRegistryNumber === 'string'
  ) {
    return state.updatedRegistryNumber;
  }
  return null;
}

export function VesselDetailPage() {
  const { vesselId = '' } = useParams();
  const { user } = useAppShell();
  const location = useLocation();
  const detail = useVesselDetail(vesselId);
  const [planNotice, setPlanNotice] = useState<{
    vesselId: string;
    message: string;
  } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const updatedRegistryNumber = updatedRegistryFromState(location.state);
  const canEdit = user.permissions.includes('fleet:write');

  useEffect(() => {
    if (updatedRegistryNumber) successRef.current?.focus();
  }, [updatedRegistryNumber]);

  if (detail.status === 'loading') return <VesselDetailLoading />;
  if (detail.status === 'error') {
    return (
      <VesselDetailFailure
        confirmedWrite={
          planNotice?.vesselId === vesselId ? planNotice.message : undefined
        }
        httpStatus={detail.httpStatus}
        error={detail.error}
        correlationId={detail.correlationId}
        onRetry={detail.retry}
      />
    );
  }

  const vessel = detail.vessel;
  return (
    <>
      <header className="page-heading page-heading--fleet vessel-detail-heading">
        <div>
          <p className="eyebrow">Fleet / vessel workspace</p>
          <h1>{vessel.name}</h1>
          <p className="vessel-detail-heading__registry">{vessel.registryNumber}</p>
        </div>
        {canEdit ? (
          <Link className="button button--primary" to={`/app/vessels/${vessel.id}/edit`}>
            Edit vessel
          </Link>
        ) : (
          <p className="page-heading__meta">Read-only watch</p>
        )}
      </header>

      {updatedRegistryNumber ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={successRef}>
          <span aria-hidden="true">✓</span>
          <p>
            <strong>Vessel updated.</strong> {updatedRegistryNumber} now reflects the
            saved details.
          </p>
        </div>
      ) : null}

      {detail.refreshError ? (
        <div role="alert" className="form-error">
          <p>
            {detail.refreshError} Activity may be outdated; confirmed writes are saved.
          </p>
          <button className="button button--secondary" onClick={detail.refresh}>
            Retry Activity
          </button>
        </div>
      ) : null}

      <VesselCompliance
        vesselId={vessel.id}
        canWrite={canEdit}
        onCertificateCreated={detail.refresh}
      />

      {user.permissions.includes('crew:read') ? (
        <VesselAssignments
          key={vessel.id}
          vesselId={vessel.id}
          canWrite={user.permissions.includes('crew:write')}
          onSaved={(message) => {
            setPlanNotice({ vesselId, message });
            detail.refresh();
          }}
        />
      ) : null}

      <div className="vessel-detail-grid">
        {user.permissions.includes('maintenance:read') ? (
          <VesselMaintenance
            key={`${user.id}:${vessel.id}`}
            vesselId={vessel.id}
            vesselStatus={vessel.status}
            canWrite={user.permissions.includes('maintenance:write')}
            onSaved={(message) => {
              setPlanNotice({ vesselId, message });
              detail.refresh();
            }}
          />
        ) : null}
        <section className="vessel-facts" aria-labelledby="vessel-facts-heading">
          <p className="eyebrow">Current record</p>
          <h2 id="vessel-facts-heading">Fleet identity</h2>
          <dl>
            <div>
              <dt>Registry number</dt>
              <dd className="registry-number">{vessel.registryNumber}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className="status-pill">{vessel.status}</span>
              </dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd>{formattedDateTime(vessel.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formattedDateTime(vessel.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        <VesselActivityPanel activities={vessel.activity} />
      </div>
    </>
  );
}
