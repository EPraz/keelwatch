import type { MaintenanceOrder } from './maintenance.types';
import type { MaintenanceInput } from './maintenance.api';
import {
  maintenanceDraft,
  maintenanceFieldLabels,
  type MaintenanceField,
} from './maintenance-draft';
import { maintenanceLabel } from './maintenance-options';

export function MaintenanceConflictReview({
  baseline,
  current,
  draft,
  selectedAssignee,
  onUseCurrent,
  onAccept,
}: {
  baseline: MaintenanceOrder;
  current: MaintenanceOrder;
  draft: MaintenanceInput;
  selectedAssignee?: MaintenanceOrder['assignee'];
  onUseCurrent: (field: MaintenanceField) => void;
  onAccept: () => void;
}) {
  const original = maintenanceDraft(baseline);
  const latest = maintenanceDraft(current);
  const changed = (Object.keys(maintenanceFieldLabels) as MaintenanceField[]).filter(
    (field) => original[field] !== latest[field],
  );
  const display = (
    field: MaintenanceField,
    input: MaintenanceInput,
    order?: MaintenanceOrder,
  ) =>
    field === 'assigneeId'
      ? order?.assignee?.id === input.assigneeId
        ? order.assignee.displayName
        : selectedAssignee?.id === input.assigneeId
          ? selectedAssignee.displayName
          : input.assigneeId
            ? 'Selected responsible user'
            : 'Unassigned'
      : field === 'category' || field === 'priority'
        ? maintenanceLabel(input[field])
        : (input[field] ?? 'None');
  const final = ['CLOSED', 'CANCELLED'].includes(current.status);
  return (
    <section className="maintenance-review" aria-labelledby="maintenance-review-heading">
      <h3 id="maintenance-review-heading">Review current order</h3>
      <p>
        Your draft is retained. Current revision: {current.revision}; status:{' '}
        {maintenanceLabel(current.status)}. Review each changed field, then continue and
        save explicitly.
      </p>
      {changed.length === 0 ? (
        <p>No editable fields changed; the revision or status changed.</p>
      ) : (
        <dl className="crew-records">
          {changed.map((field) => (
            <div key={field}>
              <dt>{maintenanceFieldLabels[field]} changed</dt>
              <dd>
                <span>Previous: {display(field, original, baseline)}</span>
                <span>Current: {display(field, latest, current)}</span>
                <span>
                  Your draft:{' '}
                  {display(
                    field,
                    draft,
                    draft.assigneeId === current.assignee?.id ? current : baseline,
                  )}
                </span>
                <div className="assignment-history__actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => onUseCurrent(field)}
                  >
                    Use current {maintenanceFieldLabels[field]}
                  </button>
                  <span>To keep your value, leave the draft unchanged.</span>
                </div>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {final ? (
        <p>
          This order is final. Its fields cannot be saved; your draft remains visible.
        </p>
      ) : (
        <button type="button" className="button button--secondary" onClick={onAccept}>
          Continue with reviewed values
        </button>
      )}
    </section>
  );
}
