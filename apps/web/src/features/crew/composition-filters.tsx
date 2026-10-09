import { useRef, useState, type FormEvent } from 'react';
import { validAssignmentDate } from './use-assignment-form';

export function CompositionFilters({
  date,
  role,
  onApply,
}: {
  readonly date: string;
  readonly role: string;
  readonly onApply: (date: string, role: string) => void;
}) {
  const [selectedDate, setDate] = useState(date);
  const [selectedRole, setRole] = useState(role);
  const [error, setError] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  function apply(event: FormEvent) {
    event.preventDefault();
    if (selectedDate && !validAssignmentDate(selectedDate)) {
      setError(true);
      dateRef.current?.focus();
      return;
    }
    setError(false);
    onApply(selectedDate, selectedRole);
  }
  return (
    <form className="composition-filters" onSubmit={apply} noValidate>
      <div className="form-field">
        <label htmlFor="composition-date">Composition date (UTC)</label>
        <input
          ref={dateRef}
          id="composition-date"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          value={selectedDate}
          onChange={(event) => setDate(event.target.value)}
          aria-invalid={error}
          aria-describedby="composition-date-hint"
        />
        <p id="composition-date-hint" className="field-hint">
          {error
            ? 'Use a valid calendar date between years 0001 and 9999.'
            : 'Leave blank to consult server UTC today.'}
        </p>
      </div>
      <div className="form-field">
        <label htmlFor="composition-role">Demo function</label>
        <select
          id="composition-role"
          value={selectedRole}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">All functions</option>
          <option value="DEMO_DECK">Deck role (demo)</option>
          <option value="DEMO_SUPPORT">Support role (demo)</option>
        </select>
      </div>
      <button className="button button--secondary" type="submit">
        Apply composition filters
      </button>
    </form>
  );
}
