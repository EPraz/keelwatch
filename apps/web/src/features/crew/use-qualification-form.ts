import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { CrewApiError, recordQualification } from './crew.api';
import type { QualificationInput } from './qualification.types';

const initialValues: QualificationInput = {
  kind: 'DEMO_SAFETY',
  referenceNumber: '',
  validFrom: '',
  expiresOn: '',
};
function validDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    !value.startsWith('0000-') &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function useQualificationForm(
  crewMemberId: string,
  onSaved: (reference: string) => void,
) {
  const session = useAuthSession();
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<
    Partial<Record<keyof QualificationInput, boolean>>
  >({});
  const errorRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const update = (field: keyof QualificationInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (request.current) return;
    const normalized = {
      ...values,
      referenceNumber: values.referenceNumber.trim().toUpperCase(),
    };
    const datesInvalid =
      !validDate(values.validFrom) ||
      !validDate(values.expiresOn) ||
      values.validFrom > values.expiresOn;
    const fields = {
      referenceNumber: !/^KW-Q-[0-9]{6}$/u.test(normalized.referenceNumber),
      validFrom: datesInvalid,
      expiresOn: datesInvalid,
    };
    setInvalid(fields);
    if (Object.values(fields).some(Boolean)) {
      setError(
        'Use a reference in the format KW-Q-###### and valid dates with valid from on or before expires on.',
      );
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
      const saved = await recordQualification(
        token,
        crewMemberId,
        normalized,
        controller.signal,
      );
      if (!controller.signal.aborted) onSaved(saved.referenceNumber);
    } catch (failure) {
      if (controller.signal.aborted) return;
      setInvalid({
        referenceNumber: failure instanceof CrewApiError && failure.status === 409,
      });
      setError(
        failure instanceof CrewApiError
          ? `${failure.message}${failure.correlationId ? ` Reference: ${failure.correlationId}` : ''}`
          : 'The qualification could not be saved. Your values are still here; try again.',
      );
    } finally {
      if (!controller.signal.aborted) {
        setPending(false);
        request.current = null;
      }
    }
  };
  return { values, pending, error, invalid, errorRef, update, submit };
}
