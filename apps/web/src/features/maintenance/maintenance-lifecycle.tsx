import { useEffect, useRef } from 'react';
import type { MaintenanceOrder } from './maintenance.types';
import { useMaintenanceLifecycle } from './use-maintenance-lifecycle';
import {
  actionLabels,
  lifecycleActions,
  lifecycleReasons,
  type MaintenanceAction,
} from './maintenance-lifecycle-options';
import { maintenanceLabel } from './maintenance-options';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceTransitionReview } from './maintenance-transition-review';
import { maintenanceFieldLabels, type MaintenanceField } from './maintenance-draft';

export function MaintenanceLifecycle({
  vesselId,
  initial,
  onSaved,
}: {
  vesselId: string;
  initial: MaintenanceOrder;
  onSaved: (order: MaintenanceOrder) => void;
}) {
  const form = useMaintenanceLifecycle(vesselId, initial, onSaved);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (form.error || form.latest || form.reviewError) errorRef.current?.focus();
  }, [form.error, form.latest, form.reviewError]);
  const record = form.latest ?? form.baseline;
  const actions = lifecycleActions[record.status];
  const permitted = !!form.action && actions.includes(form.action);
  const reasons =
    form.action === 'BLOCK' || form.action === 'CANCEL'
      ? lifecycleReasons[form.action]
      : [];
  const reasonErrors = form.error?.fieldErrors?.reasonCode;
  return (
    <form
      className="vessel-form maintenance-lifecycle"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.save();
      }}
    >
      <h2>Lifecycle actions</h2>
      <p>
        Actions use saved order details. Save field changes before acting. Closing and
        cancellation are final.
      </p>
      {form.error ? (
        <div role="alert" className="form-error" tabIndex={-1} ref={errorRef}>
          <p>{form.error.message}</p>
          {form.error.correlationId ? (
            <p>Error reference: {form.error.correlationId}</p>
          ) : null}
          {Object.entries(form.error.fieldErrors ?? {})
            .filter(([field]) => field !== 'reasonCode')
            .map(([field, errors]) => (
              <p key={field}>
                {maintenanceFieldLabelsForTransition(field)}: {errors.join(' ')}
              </p>
            ))}
        </div>
      ) : null}
      {form.needsReview ? (
        <>
          <p>Retained intent: {form.action ? actionLabels[form.action] : 'None'}.</p>
          {form.reason ? <p>Retained reason: {maintenanceLabel(form.reason)}</p> : null}
          {form.reviewLoading ? (
            <p role="status">Loading current state; your intent is retained…</p>
          ) : null}
          {form.reviewError ? (
            <MaintenanceFailure
              error={form.reviewError}
              onRetry={() => void form.review()}
            />
          ) : null}
          {form.latest ? (
            <MaintenanceTransitionReview
              baseline={form.baseline}
              latest={form.latest}
              onAccept={form.acceptReview}
            />
          ) : null}
        </>
      ) : null}
      {form.action && !permitted ? (
        <p role="status">
          {actionLabels[form.action]} is no longer available in the current state.
        </p>
      ) : null}
      {actions.length ? (
        <fieldset disabled={form.pending} className="maintenance-fields">
          <legend>Choose a permitted action</legend>
          <div className="form-field">
            <label htmlFor="maintenance-action">Lifecycle action</label>
            <select
              id="maintenance-action"
              value={permitted ? form.action : ''}
              disabled={form.needsReview}
              onChange={(event) => {
                form.setAction(event.target.value as MaintenanceAction | '');
                form.setReason('');
              }}
            >
              <option value="">Choose an action</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action]}
                </option>
              ))}
            </select>
          </div>
          {permitted && reasons.length ? (
            <div className="form-field">
              <label htmlFor="maintenance-reason">
                {form.action === 'BLOCK' ? 'Block reason' : 'Cancellation reason'}
              </label>
              <select
                id="maintenance-reason"
                value={form.reason}
                aria-invalid={!!reasonErrors?.length}
                aria-describedby={
                  reasonErrors?.length ? 'maintenance-reason-error' : undefined
                }
                onChange={(event) => form.setReason(event.target.value)}
              >
                <option value="">Choose a reason</option>
                {reasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {maintenanceLabel(reason)}
                  </option>
                ))}
              </select>
              {reasonErrors?.length ? (
                <p id="maintenance-reason-error">{reasonErrors.join(' ')}</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : (
        <p>This order is final; lifecycle actions are unavailable.</p>
      )}
      {permitted && form.action ? (
        <button
          className="button button--primary"
          disabled={
            form.pending ||
            form.needsReview ||
            (!!form.error && [401, 403, 404].includes(form.error.status))
          }
        >
          {form.pending ? 'Saving lifecycle action…' : actionLabels[form.action]}
        </button>
      ) : null}
    </form>
  );
}

function maintenanceFieldLabelsForTransition(field: string) {
  return maintenanceFieldLabels[field as MaintenanceField] ?? field;
}
