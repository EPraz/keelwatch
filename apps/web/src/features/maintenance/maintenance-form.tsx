import { useEffect, useRef, useState } from 'react';
import type { MaintenanceOrder } from './maintenance.types';
import { useMaintenanceForm } from './use-maintenance-form';
import { MaintenanceAssigneePicker } from './maintenance-assignee-picker';
import { maintenanceLabel, maintenancePriorities } from './maintenance-options';
import type { MaintenanceField } from './maintenance-draft';
import { MaintenanceFormError } from './maintenance-form-error';
import { MaintenanceConflictReview } from './maintenance-conflict-review';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceCreationRecovery } from './maintenance-creation-recovery';

export function MaintenanceForm({
  vesselId,
  initial,
  locked = false,
  final = false,
  onSaved,
}: {
  vesselId: string;
  initial?: MaintenanceOrder;
  locked?: boolean;
  final?: boolean;
  onSaved: (order: MaintenanceOrder) => void;
}) {
  const form = useMaintenanceForm(vesselId, initial, onSaved);
  const errorRef = useRef<HTMLDivElement>(null);
  const [selectedAssignee, setSelectedAssignee] =
    useState<MaintenanceOrder['assignee']>(null);
  useEffect(() => {
    if (form.error) errorRef.current?.focus();
  }, [form.error]);
  const fieldError = (field: MaintenanceField) => form.error?.fieldErrors?.[field];
  return (
    <form
      className="vessel-form maintenance-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!locked) void form.save();
      }}
    >
      <h3>{initial ? 'Edit maintenance order' : 'New maintenance order'}</h3>
      {form.error ? (
        <MaintenanceFormError error={form.error} summaryRef={errorRef} />
      ) : null}
      {form.needsReview ? (
        <>
          {form.reviewLoading ? (
            <p role="status">Loading current order; your draft is retained…</p>
          ) : null}
          {form.reviewError ? (
            <MaintenanceFailure
              error={form.reviewError}
              onRetry={() => void form.reviewCurrent()}
            />
          ) : null}
          {form.baseline && form.currentOrder ? (
            <MaintenanceConflictReview
              baseline={form.baseline}
              current={form.currentOrder}
              draft={form.draft}
              selectedAssignee={selectedAssignee}
              onUseCurrent={form.useCurrent}
              onAccept={form.acceptReview}
            />
          ) : null}
          {!form.baseline && form.creationCheck ? (
            <MaintenanceCreationRecovery
              vesselId={vesselId}
              page={form.creationCheck}
              pending={form.reviewLoading}
              onPage={(page) => void form.reviewCurrent(page)}
              onAccept={form.acceptCreationRetry}
            />
          ) : null}
        </>
      ) : null}
      <fieldset disabled={form.pending || locked} className="maintenance-fields">
        <legend>Order details</legend>
        <div className="form-field">
          <label htmlFor="order-title">Order title</label>
          <input
            id="order-title"
            value={form.draft.title}
            maxLength={120}
            required
            aria-invalid={!!fieldError('title')}
            aria-describedby={fieldError('title') ? 'order-title-error' : undefined}
            onChange={(event) =>
              form.setDraft({ ...form.draft, title: event.target.value })
            }
          />
          {fieldError('title') ? (
            <p id="order-title-error">{fieldError('title')?.join(' ')}</p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="order-category">Category</label>
          <select
            id="order-category"
            value={form.draft.category}
            onChange={(event) =>
              form.setDraft({
                ...form.draft,
                category: event.target.value as MaintenanceOrder['category'],
              })
            }
          >
            {['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'].map((value) => (
              <option key={value} value={value}>
                {maintenanceLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="order-priority">Priority</label>
          <select
            id="order-priority"
            value={form.draft.priority}
            onChange={(event) =>
              form.setDraft({
                ...form.draft,
                priority: event.target.value as MaintenanceOrder['priority'],
              })
            }
          >
            {maintenancePriorities.map((value) => (
              <option key={value} value={value}>
                {maintenanceLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="order-date">Target date</label>
          <input
            id="order-date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={form.draft.targetDate ?? ''}
            aria-invalid={!!fieldError('targetDate')}
            aria-describedby={
              fieldError('targetDate')
                ? 'order-date-hint order-date-error'
                : 'order-date-hint'
            }
            onChange={(event) =>
              form.setDraft({ ...form.draft, targetDate: event.target.value || null })
            }
          />
          <p id="order-date-hint" className="field-hint">
            Optional while Open; required to plan the order. Past dates are allowed. No
            reminders are sent.
          </p>
          {fieldError('targetDate') ? (
            <p id="order-date-error">{fieldError('targetDate')?.join(' ')}</p>
          ) : null}
        </div>
        <MaintenanceAssigneePicker
          vesselId={vesselId}
          value={form.draft.assigneeId}
          errors={fieldError('assigneeId')}
          onSelection={setSelectedAssignee}
          retained={form.currentOrder?.assignee ?? form.baseline?.assignee}
          onChange={(assigneeId) => form.setDraft({ ...form.draft, assigneeId })}
        />
      </fieldset>
      {!locked ? (
        <button
          className="button button--primary"
          aria-busy={form.pending}
          disabled={
            form.pending ||
            form.needsReview ||
            (!!form.error && [401, 403, 404].includes(form.error.status))
          }
        >
          {form.pending
            ? 'Saving maintenance order…'
            : initial
              ? 'Save maintenance changes'
              : 'Create maintenance order'}
        </button>
      ) : (
        <p>
          {final
            ? 'This order is final; retained draft values cannot be saved.'
            : 'Your draft is retained. Read the current order before saving.'}
        </p>
      )}
    </form>
  );
}
