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
export function validAssignmentDate(value: string) {
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
  const [fieldErrors, setFieldErrors] = useState<
    Readonly<Record<string, readonly string[]>>
  >({});
  const errorRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (error) errorRef.current?.focus({ preventScroll: true });
  }, [error]);
  function update(key: keyof AssignmentInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    const errors: Record<string, readonly string[]> = {};
    if (!selected) errors.crewNumber = ['Choose an existing crew profile.'];
    if (!validAssignmentDate(values.startsOn))
      errors.startsOn = ['Use a valid start date.'];
    if (!validAssignmentDate(values.endsOn) || values.startsOn > values.endsOn)
      errors.endsOn = ['Use a valid end date on or after the start date.'];
    setFieldErrors(errors);
    if (!selected || Object.keys(errors).length > 0) {
      setError('Select a profile and use valid dates with start on or before end.');
      errorRef.current?.focus({ preventScroll: true });
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
        setFieldErrors({});
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
        setFieldErrors(failure.fieldErrors);
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
    fieldErrors,
    errorRef,
    update,
    setSelected,
    submit,
  };
}
