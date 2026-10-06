import type { ReactNode } from 'react';
import type { CertificateFieldErrors } from './certificate-form.validation';
import type { CertificateType, CreateCertificateInput } from './compliance.types';

interface CertificateFormFieldsProps {
  readonly idPrefix: string;
  readonly certificateTypes: readonly CertificateType[];
  readonly values: CreateCertificateInput;
  readonly errors: CertificateFieldErrors;
  readonly pending: boolean;
  readonly onChange: (field: keyof CreateCertificateInput, value: string) => void;
}

function FormField({
  label,
  inputId,
  errorId,
  error,
  children,
}: {
  readonly label: string;
  readonly inputId: string;
  readonly errorId: string;
  readonly error?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CertificateFormFields({
  idPrefix,
  certificateTypes,
  values,
  errors,
  pending,
  onChange,
}: CertificateFormFieldsProps) {
  const inputId = (field: keyof CreateCertificateInput) => `${idPrefix}-${field}`;
  const errorId = (field: keyof CreateCertificateInput) => `${inputId(field)}-error`;
  const describedBy = (field: keyof CreateCertificateInput) =>
    errors[field] ? errorId(field) : undefined;

  return (
    <div className="certificate-form__grid">
      <FormField
        label="Certificate type"
        inputId={inputId('certificateTypeCode')}
        errorId={errorId('certificateTypeCode')}
        error={errors.certificateTypeCode?.[0]}
      >
        <select
          id={inputId('certificateTypeCode')}
          name="certificateTypeCode"
          value={values.certificateTypeCode}
          disabled={pending}
          aria-invalid={Boolean(errors.certificateTypeCode)}
          aria-describedby={describedBy('certificateTypeCode')}
          onChange={(event) => onChange('certificateTypeCode', event.target.value)}
        >
          {certificateTypes.map((type) => (
            <option key={type.code} value={type.code}>
              {type.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="Reference"
        inputId={inputId('referenceNumber')}
        errorId={errorId('referenceNumber')}
        error={errors.referenceNumber?.[0]}
      >
        <input
          id={inputId('referenceNumber')}
          name="referenceNumber"
          maxLength={80}
          autoComplete="off"
          value={values.referenceNumber}
          disabled={pending}
          aria-invalid={Boolean(errors.referenceNumber)}
          aria-describedby={describedBy('referenceNumber')}
          onChange={(event) => onChange('referenceNumber', event.target.value)}
        />
      </FormField>
      <FormField
        label="Issuer"
        inputId={inputId('issuer')}
        errorId={errorId('issuer')}
        error={errors.issuer?.[0]}
      >
        <input
          id={inputId('issuer')}
          name="issuer"
          maxLength={120}
          autoComplete="organization"
          value={values.issuer}
          disabled={pending}
          aria-invalid={Boolean(errors.issuer)}
          aria-describedby={describedBy('issuer')}
          onChange={(event) => onChange('issuer', event.target.value)}
        />
      </FormField>
      {(['issuedOn', 'expiresOn'] as const).map((field) => (
        <FormField
          key={field}
          label={field === 'issuedOn' ? 'Issued on' : 'Expires on'}
          inputId={inputId(field)}
          errorId={errorId(field)}
          error={errors[field]?.[0]}
        >
          <input
            id={inputId(field)}
            name={field}
            type="date"
            value={values[field]}
            disabled={pending}
            aria-invalid={Boolean(errors[field])}
            aria-describedby={describedBy(field)}
            onChange={(event) => onChange(field, event.target.value)}
          />
        </FormField>
      ))}
    </div>
  );
}
