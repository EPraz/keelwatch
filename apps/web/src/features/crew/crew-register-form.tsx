import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { CrewApiError, registerCrew, type CrewMember } from './crew.api';

export function CrewRegisterForm({
  onSaved,
}: {
  readonly onSaved: (member: CrewMember) => void;
}) {
  const session = useAuthSession();
  const [displayName, setDisplayName] = useState('');
  const [crewNumber, setCrewNumber] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState({ displayName: false, crewNumber: false });
  const errorRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const name = displayName.trim();
    const number = crewNumber.trim().toUpperCase();
    const fields = {
      displayName: name.length < 2 || name.length > 120,
      crewNumber: !/^KW-C-[0-9]{6}$/u.test(number),
    };
    setInvalid(fields);
    if (fields.displayName || fields.crewNumber) {
      setError(
        'Use a name of 2–120 characters and a crew number in the format KW-C-######.',
      );
      errorRef.current?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const token = await session.getAccessToken();
      if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
      const member = await registerCrew(token, { displayName: name, crewNumber: number });
      setDisplayName('');
      setCrewNumber('');
      onSaved(member);
    } catch (failure) {
      setInvalid({
        displayName: false,
        crewNumber: failure instanceof CrewApiError && failure.status === 409,
      });
      setError(
        failure instanceof CrewApiError
          ? `${failure.message}${failure.correlationId ? ` Reference: ${failure.correlationId}` : ''}`
          : 'The profile could not be saved. Your values are still here; try again.',
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <form className="vessel-form" noValidate onSubmit={(event) => void submit(event)}>
      {error ? (
        <div
          className="form-error"
          role="alert"
          id="crew-form-error"
          tabIndex={-1}
          ref={errorRef}
        >
          {error}
        </div>
      ) : null}
      <div className="form-field">
        <label htmlFor="crew-name">Display name</label>
        <input
          id="crew-name"
          autoComplete="off"
          maxLength={120}
          value={displayName}
          disabled={pending}
          aria-invalid={invalid.displayName}
          aria-describedby={invalid.displayName ? 'crew-form-error' : 'crew-name-hint'}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <p className="field-hint" id="crew-name-hint">
          Synthetic names only. Do not enter personal or medical data.
        </p>
      </div>
      <div className="form-field">
        <label htmlFor="crew-number">Crew number</label>
        <input
          id="crew-number"
          autoComplete="off"
          maxLength={11}
          placeholder="KW-C-000001"
          value={crewNumber}
          disabled={pending}
          aria-invalid={invalid.crewNumber}
          aria-describedby={invalid.crewNumber ? 'crew-form-error' : 'crew-number-hint'}
          onChange={(event) => setCrewNumber(event.target.value.toUpperCase())}
        />
        <p className="field-hint" id="crew-number-hint">
          A unique demo reference: KW-C- followed by six digits.
        </p>
      </div>
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? 'Registering…' : 'Register profile'}
        </button>
      </div>
    </form>
  );
}
