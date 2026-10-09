import type { MaintenanceOrder } from './maintenance.types';
import {
  maintenanceDraft,
  maintenanceFieldLabels,
  type MaintenanceField,
} from './maintenance-draft';
import { maintenanceLabel } from './maintenance-options';

export function MaintenanceTransitionReview({
  baseline,
  latest,
  onAccept,
}: {
  baseline: MaintenanceOrder;
  latest: MaintenanceOrder;
  onAccept: () => void;
}) {
  const previous = maintenanceDraft(baseline);
  const current = maintenanceDraft(latest);
  const changed = (Object.keys(maintenanceFieldLabels) as MaintenanceField[]).filter(
    (field) => previous[field] !== current[field],
  );
  function value(field: MaintenanceField, order: MaintenanceOrder) {
    if (field === 'assigneeId') return order.assignee?.displayName ?? 'Unassigned';
    const item = maintenanceDraft(order)[field];
    return item && (field === 'category' || field === 'priority')
      ? maintenanceLabel(item)
      : (item ?? 'None');
  }
  const final = latest.status === 'CLOSED' || latest.status === 'CANCELLED';
  return (
    <section className="maintenance-review" aria-labelledby="transition-review-heading">
      <h3 id="transition-review-heading">Review current state</h3>
      <p>
        Previous: {maintenanceLabel(baseline.status)} · revision {baseline.revision}.
        Current: {maintenanceLabel(latest.status)} · revision {latest.revision}.
      </p>
      {latest.reasonCode ? (
        <p>Current reason: {maintenanceLabel(latest.reasonCode)}</p>
      ) : null}
      <dl className="crew-records">
        {changed.map((field) => (
          <div key={field}>
            <dt>{maintenanceFieldLabels[field]} changed</dt>
            <dd>
              <span>Previous: {value(field, baseline)}</span>
              <span>Current: {value(field, latest)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Review current values before deciding whether to repeat the retained action.
        Nothing is submitted automatically.
      </p>
      {final ? (
        <p>
          This order is final. No further action is permitted; your intent remains
          visible.
        </p>
      ) : (
        <button type="button" className="button button--secondary" onClick={onAccept}>
          Continue with reviewed state
        </button>
      )}
    </section>
  );
}
