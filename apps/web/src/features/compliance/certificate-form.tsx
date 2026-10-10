import { Toast } from '../../app/toast';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { ComplianceApiError, createCertificate } from './compliance.api';
import { CertificateFormFields } from './certificate-form-fields';
import {
  emptyCertificateValues,
  validateCertificate,
  type CertificateFieldErrors,
} from './certificate-form.validation';
import type {
  CertificateType,
  ComplianceApiErrorBody,
  ComplianceWorkspace,
  CreateCertificateInput,
} from './compliance.types';

export function CertificateForm({
  vesselId,
  certificateTypes,
  onSaved,
}: {
  readonly vesselId: string;
  readonly certificateTypes: readonly CertificateType[];
  readonly onSaved: (workspace: ComplianceWorkspace) => void;
}) {
  const session = useAuthSession();
  const errorRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<CreateCertificateInput>(() => ({
    ...emptyCertificateValues,
    certificateTypeCode: certificateTypes[0]?.code ?? '',
  }));
  const [fieldErrors, setFieldErrors] = useState<CertificateFieldErrors>({});
  const [formError, setFormError] = useState<ComplianceApiErrorBody | null>(null);
  const [pending, setPending] = useState(false);
  const [savedReference, setSavedReference] = useState<string | null>(null);
  const hasErrors = formError !== null || Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    if (hasErrors) errorRef.current?.focus();
  }, [hasErrors]);

  const update = (field: keyof CreateCertificateInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    setSavedReference(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = {
      ...values,
      certificateTypeCode: values.certificateTypeCode.trim().toUpperCase(),
      referenceNumber: values.referenceNumber.trim(),
      issuer: values.issuer.trim(),
    };
    const errors = validateCertificate(normalized);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError({
        code: 'VALIDATION_FAILED',
        message: 'Review the highlighted fields.',
      });
      return;
    }

    setPending(true);
    setFieldErrors({});
    setFormError(null);
    setSavedReference(null);
    try {
      const token = await session.getAccessToken();
      if (!token) {
        throw new ComplianceApiError(401, {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Your session has ended. Sign in and try again.',
        });
      }
      const workspace = await createCertificate(token, vesselId, normalized);
      setSavedReference(normalized.referenceNumber);
      setValues({
        ...emptyCertificateValues,
        certificateTypeCode: certificateTypes[0]?.code ?? '',
      });
      onSaved(workspace);
    } catch (error) {
      if (error instanceof ComplianceApiError) {
        setFieldErrors(error.body.fieldErrors ?? {});
        setFormError(error.body);
      } else {
        setFormError({
          code: 'NETWORK_ERROR',
          message:
            'Compliance could not be reached. Your certificate details are still here.',
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="certificate-form"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {savedReference ? (
        <Toast role="status" tabIndex={-1}>
          <strong>Certificate recorded.</strong> {savedReference} is now in the vessel
          history.
        </Toast>
      ) : null}
      {hasErrors ? (
        <Toast role="alert" tabIndex={-1} ref={errorRef}>
          <strong>{formError?.message ?? 'Review the highlighted fields.'}</strong>
          {formError?.correlationId ? (
            <span className="correlation">Reference: {formError.correlationId}</span>
          ) : null}
        </Toast>
      ) : null}

      <CertificateFormFields
        idPrefix="new-certificate"
        certificateTypes={certificateTypes}
        values={values}
        errors={fieldErrors}
        pending={pending}
        onChange={update}
      />
      <button
        className="button button--primary"
        type="submit"
        disabled={pending || certificateTypes.length === 0}
      >
        {pending ? 'Recording certificate…' : 'Record certificate'}
      </button>
    </form>
  );
}
