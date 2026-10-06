import type { CreateCertificateInput } from './compliance.types';

export type CertificateFieldErrors = Readonly<Record<string, readonly string[]>>;

export const emptyCertificateValues: CreateCertificateInput = {
  certificateTypeCode: '',
  referenceNumber: '',
  issuer: '',
  issuedOn: '',
  expiresOn: '',
};

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function validateCertificate(
  values: CreateCertificateInput,
): CertificateFieldErrors {
  const errors: Record<string, string[]> = {};
  if (!values.certificateTypeCode) errors.certificateTypeCode = ['Select a type.'];
  if (!values.referenceNumber.trim()) errors.referenceNumber = ['Enter a reference.'];
  if (values.issuer.trim().length < 2) {
    errors.issuer = ['Issuer must contain at least 2 characters.'];
  }
  if (!isCalendarDate(values.issuedOn)) {
    errors.issuedOn = ['Enter a valid calendar date.'];
  }
  if (!isCalendarDate(values.expiresOn)) {
    errors.expiresOn = ['Enter a valid calendar date.'];
  }
  if (!errors.issuedOn && !errors.expiresOn && values.issuedOn > values.expiresOn) {
    errors.issuedOn = ['Issued on must be on or before expires on.'];
    errors.expiresOn = ['Expires on must be on or after issued on.'];
  }
  return errors;
}
