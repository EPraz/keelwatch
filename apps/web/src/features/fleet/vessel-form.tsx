import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../auth/auth-context';
import { FleetApiError } from './fleet.api';
import type { CreateVesselInput, FleetApiErrorBody, Vessel } from './fleet.types';

type FieldErrors = Readonly<Record<string, readonly string[]>>;

function validate(values: CreateVesselInput): FieldErrors {
  const errors: Record<string, string[]> = {};
  const name = values.name.trim();
  const registryNumber = values.registryNumber.trim().toUpperCase();

  if (name.length < 2) errors.name = ['Name must contain at least 2 characters.'];
  else if (name.length > 120) errors.name = ['Name must contain at most 120 characters.'];
  if (!/^KW-[0-9]{6}$/u.test(registryNumber)) {
    errors.registryNumber = ['Use the demo format KW-######.'];
  }
  return errors;
}

interface VesselFormProps {
  readonly initialValues: CreateVesselInput;
  readonly errorEyebrow: string;
  readonly submitLabel: string;
  readonly pendingLabel: string;
  readonly cancelTo: string;
  readonly save: (accessToken: string, input: CreateVesselInput) => Promise<Vessel>;
  readonly onSaved: (vessel: Vessel) => void;
}

export function VesselForm({
  initialValues,
  errorEyebrow,
  submitLabel,
  pendingLabel,
  cancelTo,
  save,
  onSaved,
}: VesselFormProps) {
  const session = useAuthSession();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<CreateVesselInput>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<FleetApiErrorBody | null>(null);
  const [pending, setPending] = useState(false);
  const hasErrors = formError !== null || Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    if (hasErrors) errorSummaryRef.current?.focus();
  }, [formError, fieldErrors, hasErrors]);

  const updateField = (field: keyof CreateVesselInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = {
      name: values.name.trim(),
      registryNumber: values.registryNumber.trim().toUpperCase(),
    };
    const clientErrors = validate(normalized);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError({
        code: 'VALIDATION_FAILED',
        message: 'Review the highlighted fields and try again.',
      });
      return;
    }

    setPending(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const accessToken = await session.getAccessToken();
      if (!accessToken) {
        throw new FleetApiError(401, {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Your session has ended. Sign in and try again.',
        });
      }
      onSaved(await save(accessToken, normalized));
    } catch (error) {
      if (error instanceof FleetApiError) {
        setFieldErrors(error.body.fieldErrors ?? {});
        setFormError(error.body);
      } else {
        setFormError({
          code: 'NETWORK_ERROR',
          message: 'The Fleet service could not be reached. Your form is still here.',
        });
      }
    } finally {
      setPending(false);
    }
  };

  const nameError = fieldErrors.name?.[0];
  const registryError = fieldErrors.registryNumber?.[0];

  return (
    <form className="vessel-form" noValidate onSubmit={(event) => void submit(event)}>
      {hasErrors ? (
        <div className="form-error" role="alert" tabIndex={-1} ref={errorSummaryRef}>
          <p className="eyebrow">{errorEyebrow}</p>
          <h2>{formError?.message ?? 'Review the highlighted fields.'}</h2>
          {formError?.correlationId ? (
            <p className="correlation">Reference: {formError.correlationId}</p>
          ) : null}
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="vessel-name">Vessel name</label>
        <input
          id="vessel-name"
          name="name"
          autoComplete="off"
          maxLength={120}
          value={values.name}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'vessel-name-error' : 'vessel-name-hint'}
          disabled={pending}
          onChange={(event) => updateField('name', event.target.value)}
        />
        <p className="field-hint" id="vessel-name-hint">
          Use a synthetic display name.
        </p>
        {nameError ? (
          <p className="field-error" id="vessel-name-error">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="registry-number">Registry number</label>
        <input
          id="registry-number"
          name="registryNumber"
          autoComplete="off"
          inputMode="text"
          maxLength={9}
          placeholder="KW-000001"
          value={values.registryNumber}
          aria-invalid={Boolean(registryError)}
          aria-describedby={
            registryError ? 'registry-number-error' : 'registry-number-hint'
          }
          disabled={pending}
          onChange={(event) =>
            updateField('registryNumber', event.target.value.toUpperCase())
          }
        />
        <p className="field-hint" id="registry-number-hint">
          Demo format: KW- followed by six digits.
        </p>
        {registryError ? (
          <p className="field-error" id="registry-number-error">
            {registryError}
          </p>
        ) : null}
      </div>

      <div className="form-actions">
        <Link className="button button--secondary" to={cancelTo}>
          Cancel
        </Link>
        <button className="button button--primary" type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
