import { Toast } from '../../app/toast';
import { useQualificationForm } from './use-qualification-form';

export function QualificationForm({
  crewMemberId,
  onSaved,
}: {
  readonly crewMemberId: string;
  readonly onSaved: (reference: string) => void;
}) {
  const { errorRef, ...form } = useQualificationForm(crewMemberId, onSaved);
  return (
    <form
      className="vessel-form"
      noValidate
      onSubmit={(event) => void form.submit(event)}
    >
      {form.error ? (
        <Toast role="alert" tabIndex={-1} ref={errorRef} id="qualification-error">
          {form.error}
        </Toast>
      ) : null}
      <div className="form-field">
        <label htmlFor="qualification-kind">Qualification type</label>
        <select
          id="qualification-kind"
          value={form.values.kind}
          disabled={form.pending}
          onChange={(event) => form.update('kind', event.target.value)}
        >
          <option value="DEMO_SAFETY">Safety familiarization (demo)</option>
          <option value="DEMO_DECK">Deck operations (demo)</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="qualification-reference">Qualification reference</label>
        <input
          id="qualification-reference"
          value={form.values.referenceNumber}
          autoComplete="off"
          maxLength={11}
          disabled={form.pending}
          aria-invalid={form.invalid.referenceNumber ?? false}
          aria-describedby={
            form.invalid.referenceNumber
              ? 'qualification-error'
              : 'qualification-reference-hint'
          }
          onChange={(event) =>
            form.update('referenceNumber', event.target.value.toUpperCase())
          }
        />
        <p className="field-hint" id="qualification-reference-hint">
          Synthetic reference: KW-Q- followed by six digits.
        </p>
      </div>
      {(
        [
          { key: 'validFrom', label: 'Valid from' },
          { key: 'expiresOn', label: 'Expires on' },
        ] as const
      ).map((field) => (
        <div className="form-field" key={field.key}>
          <label htmlFor={`qualification-${field.key}`}>{field.label}</label>
          <input
            id={`qualification-${field.key}`}
            type="date"
            value={form.values[field.key]}
            disabled={form.pending}
            aria-invalid={form.invalid[field.key] ?? false}
            aria-describedby={form.invalid[field.key] ? 'qualification-error' : undefined}
            onChange={(event) => form.update(field.key, event.target.value)}
          />
        </div>
      ))}
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={form.pending}>
          {form.pending ? 'Recording…' : 'Record qualification'}
        </button>
      </div>
    </form>
  );
}
