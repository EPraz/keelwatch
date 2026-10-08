import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { createAssignment, type AssignmentInput } from './assignment.api';
import { CrewApiError, type CrewMember } from './crew.api';

const empty: AssignmentInput = {
  crewNumber: '',
  role: 'DEMO_DECK',
  startsOn: '',
  endsOn: '',
};
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function useAssignmentForm(vesselId: string, onSaved: () => void) {
  const session = useAuthSession();
  const [values, setValues] = useState(empty);
  const [selected, setSelected] = useState<CrewMember | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Readonly<Record<string, boolean>>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  function update(key: keyof AssignmentInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    const errors = {
      crewNumber: !selected,
      startsOn: !validDate(values.startsOn),
      endsOn: !validDate(values.endsOn) || values.startsOn > values.endsOn,
    };
    setInvalid(errors);
    if (!selected || Object.values(errors).some(Boolean)) {
      setError('Select a profile and use valid dates with start on or before end.');
      errorRef.current?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    try {
      const token = await session.getAccessToken();
      if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
      if (controller.signal.aborted) return;
      await createAssignment(
        token,
        vesselId,
        { ...values, crewNumber: selected.crewNumber },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setValues(empty);
        setSelected(null);
        setInvalid({});
        onSaved();
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof CrewApiError
          ? `${failure.message}${failure.correlationId ? ` Reference: ${failure.correlationId}` : ''}`
          : 'The plan could not be confirmed. Check history before retrying.',
      );
      if (failure instanceof CrewApiError && failure.fieldErrors)
        setInvalid(
          Object.fromEntries(Object.keys(failure.fieldErrors).map((key) => [key, true])),
        );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return {
    values,
    selected,
    pending,
    error,
    invalid,
    errorRef,
    update,
    setSelected,
    submit,
  };
}
