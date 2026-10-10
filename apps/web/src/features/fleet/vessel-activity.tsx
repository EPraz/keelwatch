import type { VesselActivity } from './fleet.types';
import { formattedDateTime } from './fleet-date';

function activityTitle(activity: VesselActivity): string {
  if (activity.action === 'VESSEL_CREATED') return 'Vessel registered';
  if (activity.action === 'VESSEL_UPDATED') return 'Vessel details updated';
  if (activity.action === 'MAINTENANCE_ORDER_CREATED') return 'Maintenance order created';
  if (activity.action === 'MAINTENANCE_ORDER_UPDATED') return 'Maintenance order updated';
  if (activity.action === 'MAINTENANCE_ORDER_TRANSITIONED')
    return 'Maintenance order state changed';
  if (activity.action === 'CREW_ASSIGNMENT_CREATED') return 'Crew assignment planned';
  if (activity.action === 'CREW_ASSIGNMENT_CANCELLED') return 'Crew assignment cancelled';
  if (activity.action === 'CERTIFICATE_CREATED') return 'Certificate recorded';
  if (activity.action === 'CERTIFICATE_UPDATED') return 'Certificate updated';
  if (activity.action === 'CERTIFICATE_ARCHIVED') return 'Certificate archived';
  if (activity.action === 'CERTIFICATE_DOCUMENT_QUARANTINED')
    return 'Document safety check started';
  if (activity.action === 'CERTIFICATE_DOCUMENT_AVAILABLE') return 'Document available';
  if (activity.action === 'CERTIFICATE_DOCUMENT_REJECTED') return 'Document rejected';
  if (activity.action === 'CERTIFICATE_DOCUMENT_OBJECT_REMOVED')
    return 'Document file removed';
  return activity.action.replaceAll('_', ' ').toLowerCase();
}

export function VesselActivityPanel({
  activities,
}: {
  activities: readonly VesselActivity[];
}) {
  return (
    <section className="vessel-activity" aria-labelledby="vessel-activity-heading">
      <p className="eyebrow">Basic history</p>
      <h2 id="vessel-activity-heading">Activity</h2>
      {activities.length === 0 ? (
        <p className="vessel-activity__empty">No permitted activity is available.</p>
      ) : (
        <ol>
          {activities.map((activity) => (
            <li key={activity.id}>
              <span className="activity-marker" aria-hidden="true" />
              <div>
                <h3>{activityTitle(activity)}</h3>
                <p>
                  {activity.actorDisplayName} · {formattedDateTime(activity.occurredAt)}
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
  );
}
