import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { ComplianceApiError, updateCertificate } from './compliance.api';
import { CertificateFormFields } from './certificate-form-fields';
import {
  validateCertificate,
  type CertificateFieldErrors,
} from './certificate-form.validation';
import type {
  Certificate,
  CertificateType,
  ComplianceApiErrorBody,
  ComplianceWorkspace,
  CreateCertificateInput,
} from './compliance.types';

export function CertificateEditForm({
  vesselId,
  certificate,
  certificateTypes,
  onSaved,
  onCancel,
}: {
  readonly vesselId: string;
  readonly certificate: Certificate;
  readonly certificateTypes: readonly CertificateType[];
  readonly onSaved: (workspace: ComplianceWorkspace) => void;
  readonly onCancel: () => void;
}) {
  const session = useAuthSession();
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<CreateCertificateInput>({
    certificateTypeCode: certificate.certificateTypeCode,
    referenceNumber: certificate.referenceNumber,
    issuer: certificate.issuer,
    issuedOn: certificate.issuedOn,
    expiresOn: certificate.expiresOn,
  });
  const [fieldErrors, setFieldErrors] = useState<CertificateFieldErrors>({});
  const [formError, setFormError] = useState<ComplianceApiErrorBody | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const hasErrors = formError !== null || Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    if (hasErrors) errorRef.current?.focus();
  }, [hasErrors]);
  useEffect(() => {
    if (saved) successRef.current?.focus();
  }, [saved]);

  const update = (field: keyof CreateCertificateInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
    setSaved(false);
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
    setSaved(false);
    try {
      const token = await session.getAccessToken();
      if (!token) {
        throw new ComplianceApiError(401, {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Your session has ended. Sign in and try again.',
        });
      }
      const workspace = await updateCertificate(
        token,
        vesselId,
        certificate.id,
        normalized,
      );
      setSaved(true);
      onSaved(workspace);
    } catch (error) {
      if (error instanceof ComplianceApiError) {
        setFieldErrors(error.body.fieldErrors ?? {});
        setFormError(error.body);
      } else {
        setFormError({
          code: 'NETWORK_ERROR',
          message: 'Compliance could not be reached. Your changes are still here.',
        });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="certificate-edit-form"
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {saved ? (
        <div
          className="compliance-notice compliance-notice--success"
          role="status"
          tabIndex={-1}
          ref={successRef}
        >
          <strong>Certificate updated.</strong>
        </div>
      ) : null}
      {hasErrors ? (
        <div
          className="compliance-notice compliance-notice--error"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          <strong>{formError?.message ?? 'Review the highlighted fields.'}</strong>
          {formError?.correlationId ? (
            <span className="correlation">Reference: {formError.correlationId}</span>
          ) : null}
        </div>
      ) : null}
      <CertificateFormFields
        idPrefix={`edit-${certificate.id}`}
        certificateTypes={certificateTypes}
        values={values}
        errors={fieldErrors}
        pending={pending}
        onChange={update}
      />
      <div className="certificate-history__actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          {pending ? 'Saving changes…' : 'Save changes'}
        </button>
        <button className="button button--secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
