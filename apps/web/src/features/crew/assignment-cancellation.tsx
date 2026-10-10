import { Toast } from '../../app/toast';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { cancelAssignment, type Assignment } from './assignment.api';
import { CrewApiError } from './crew.api';

export function AssignmentCancellation({
  vesselId,
  plan,
  onSaved,
}: {
  readonly vesselId: string;
  readonly plan: Assignment;
  readonly onSaved: () => void;
}) {
  const session = useAuthSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (open) selectRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    if (!reason) {
      setError('Choose a cancellation reason.');
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
      await cancelAssignment(token, vesselId, plan.id, reason, controller.signal);
      if (!controller.signal.aborted) onSaved();
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof CrewApiError
          ? `${failure.message}${failure.correlationId ? ` Reference: ${failure.correlationId}` : ''}`
          : 'Cancellation could not be confirmed. Check history; retrying the same reason is safe.',
      );
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="button button--secondary"
        ref={triggerRef}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        disabled={open}
      >
        Cancel plan for {plan.crewNumber} · {plan.startsOn}
      </button>
      {open ? (
        <form className="vessel-form" noValidate onSubmit={(event) => void submit(event)}>
          <p>
            Cancel {plan.displayName} · {plan.crewNumber} · {plan.roleLabel}? This
            invalidates the entire plan ({plan.startsOn} — {plan.endsOn}) and frees all
            its dates. History is retained. This cannot be undone; it is not an early
            departure.
          </p>
          {error ? (
            <Toast
              role="alert"
              tabIndex={-1}
              ref={errorRef}
              id={`cancel-error-${plan.id}`}
            >
              {error}
            </Toast>
          ) : null}
          <div className="form-field">
            <label htmlFor={`cancel-reason-${plan.id}`}>Cancellation reason</label>
            <select
              id={`cancel-reason-${plan.id}`}
              ref={selectRef}
              value={reason}
              disabled={pending}
              aria-invalid={!!error}
              aria-describedby={error ? `cancel-error-${plan.id}` : undefined}
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="">Choose a reason</option>
              <option value="INCORRECT_RECORD">Incorrect record</option>
              <option value="PLAN_CHANGED">Plan changed</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={pending}>
              {pending ? 'Cancelling…' : 'Confirm cancellation'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Keep plan
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
