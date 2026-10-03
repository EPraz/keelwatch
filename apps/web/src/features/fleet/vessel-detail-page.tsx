import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import type { VesselActivity } from './fleet.types';
import { useVesselDetail } from './use-vessel-detail';
import { VesselDetailFailure, VesselDetailLoading } from './vessel-detail-states';

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

function formattedDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function activityTitle(activity: VesselActivity): string {
  if (activity.action === 'VESSEL_CREATED') return 'Vessel registered';
  if (activity.action === 'VESSEL_UPDATED') return 'Vessel details updated';
  return activity.action.replaceAll('_', ' ').toLowerCase();
}

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

      <div className="vessel-detail-grid">
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

        <section className="vessel-activity" aria-labelledby="vessel-activity-heading">
          <p className="eyebrow">Basic history</p>
          <h2 id="vessel-activity-heading">Activity</h2>
          {vessel.activity.length === 0 ? (
            <p className="vessel-activity__empty">No permitted activity is available.</p>
          ) : (
            <ol>
              {vessel.activity.map((activity) => (
                <li key={activity.id}>
                  <span className="activity-marker" aria-hidden="true" />
                  <div>
                    <h3>{activityTitle(activity)}</h3>
                    <p>
                      {activity.actorDisplayName} ·{' '}
                      {formattedDateTime(activity.occurredAt)}
                    </p>
                    {activity.changedFields.length > 0 ? (
                      <p className="activity-fields">
                        Changed: {activity.changedFields.join(', ')}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
