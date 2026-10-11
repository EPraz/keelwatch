import { Toast } from '../../app/toast';
import { useSearchParams } from 'react-router-dom';
import { AssignmentProfilePicker } from './assignment-profile-picker';
import { useAssignmentForm, validAssignmentDate } from './use-assignment-form';
import { RequirementPreview } from './requirement-preview';

export function AssignmentForm({
  vesselId,
  onSaved,
}: {
  readonly vesselId: string;
  readonly onSaved: () => void;
}) {
  const { errorRef, ...form } = useAssignmentForm(vesselId, onSaved);
  const [params, setParams] = useSearchParams();
  const draft = { ...form.values, crewNumber: form.selected?.crewNumber ?? '' };
  const canEvaluate =
    !!form.selected &&
    ['DEMO_DECK', 'DEMO_SUPPORT'].includes(draft.role) &&
    validAssignmentDate(draft.startsOn) &&
    validAssignmentDate(draft.endsOn) &&
    draft.startsOn <= draft.endsOn;
  const rawPage = Number(params.get('profilePage') ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  return (
    <form
      className="vessel-form"
      noValidate
      onSubmit={(event) => void form.submit(event)}
    >
      {form.error ? (
        <Toast id="assignment-error" role="alert" tabIndex={-1} ref={errorRef}>
          {form.error}
        </Toast>
      ) : null}
      <AssignmentProfilePicker
        page={page}
        selected={form.selected}
        pending={form.pending}
        invalid={!!form.fieldErrors.crewNumber?.length}
        onSelect={form.setSelected}
        onPage={(next) =>
          setParams((current) => {
            current.set('profilePage', String(next));
            return current;
          })
        }
      />
      {form.fieldErrors.crewNumber?.length ? (
        <p className="field-error" id="assignment-profile-error">
          {form.fieldErrors.crewNumber.join(' ')}
        </p>
      ) : null}
      <div className="form-field">
        <label htmlFor="assignment-role">Onboard function (demo)</label>
        <select
          id="assignment-role"
          value={form.values.role}
          disabled={form.pending}
          onChange={(event) => form.update('role', event.target.value)}
        >
          <option value="DEMO_DECK">Deck role (demo)</option>
          <option value="DEMO_SUPPORT">Support role (demo)</option>
        </select>
      </div>
      {(
        [
          { key: 'startsOn', label: 'Starts on' },
          { key: 'endsOn', label: 'Ends on' },
        ] as const
      ).map((field) => (
        <div className="form-field" key={field.key}>
          <label htmlFor={`assignment-${field.key}`}>{field.label}</label>
          <input
            id={`assignment-${field.key}`}
            type="date"
            value={form.values[field.key]}
            disabled={form.pending}
            aria-invalid={!!form.fieldErrors[field.key]?.length}
            aria-describedby={
              form.fieldErrors[field.key]?.length
                ? `assignment-${field.key}-error assignment-dates-hint`
                : 'assignment-dates-hint'
            }
            onChange={(event) => form.update(field.key, event.target.value)}
          />
          {form.fieldErrors[field.key]?.length ? (
            <p className="field-error" id={`assignment-${field.key}-error`}>
              {form.fieldErrors[field.key]?.join(' ')}
            </p>
          ) : null}
        </div>
      ))}
      <p className="field-hint" id="assignment-dates-hint">
        Both dates are included. One-day plans are allowed; overlapping plans across
        vessels are not.
      </p>
      <RequirementPreview
        key={JSON.stringify([vesselId, draft])}
        vesselId={vesselId}
        input={draft}
        enabled={canEvaluate && !form.pending}
      />
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={form.pending}>
          {form.pending ? 'Saving…' : 'Create plan'}
        </button>
      </div>
    </form>
  );
}
