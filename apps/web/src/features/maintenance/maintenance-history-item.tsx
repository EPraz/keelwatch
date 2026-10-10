import type { MaintenanceHistoryPage } from './maintenance.types';
import { maintenanceLabel } from './maintenance-options';
import { formattedDateTime } from '../fleet/fleet-date';

type HistoryEvent = MaintenanceHistoryPage['items'][number];
const fieldNames = {
  title: 'Title',
  category: 'Category',
  priority: 'Priority',
  status: 'State',
  assigneeId: 'Responsible user',
  targetDate: 'Target date',
};
function displayValue(field: keyof typeof fieldNames, value: string | null) {
  if (value === null) return 'Not recorded';
  return field === 'category' || field === 'priority' || field === 'status'
    ? maintenanceLabel(value)
    : value;
}
export function MaintenanceHistoryItem({ event }: { event: HistoryEvent }) {
  const title =
    event.action === 'MAINTENANCE_ORDER_CREATED'
      ? 'Order created'
      : event.action === 'MAINTENANCE_ORDER_UPDATED'
        ? 'Order fields changed'
        : 'Order state changed';
  return (
    <li>
      <span className="activity-marker" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>
          {event.actorDisplayName} ·{' '}
          <time dateTime={event.occurredAt}>{formattedDateTime(event.occurredAt)}</time>
        </p>
        <dl className="crew-records">
          {event.changes.map((change) => (
            <div key={change.field}>
              <dt>{fieldNames[change.field]}</dt>
              <dd>
                {event.action !== 'MAINTENANCE_ORDER_CREATED' ? (
                  <>
                    <span>{displayValue(change.field, change.oldValue)}</span>
                    {' → '}
                  </>
                ) : null}
                <span>{displayValue(change.field, change.newValue)}</span>
              </dd>
            </div>
          ))}
        </dl>
        {event.reasonCode ? <p>Reason: {maintenanceLabel(event.reasonCode)}</p> : null}
        {event.changes.length === 0 ? (
          <p>No recognized field details were recorded.</p>
        ) : null}
      </div>
    </li>
  );
}
