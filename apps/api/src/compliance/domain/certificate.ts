const MILLISECONDS_PER_DAY = 86_400_000;

export type ComplianceStatus = 'MISSING' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';

export interface CertificateTypeRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly isRequired: boolean;
}

export interface CertificateRecord {
  readonly id: string;
  readonly vesselId: string;
  readonly certificateTypeId: string;
  readonly certificateTypeCode: string;
  readonly certificateTypeName: string;
  readonly referenceNumber: string;
  readonly issuer: string;
  readonly issuedOn: Date;
  readonly expiresOn: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt: Date | null;
}

export interface ComplianceRequirement {
  readonly certificateType: CertificateTypeRecord;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly certificate: CertificateRecord | null;
}

export interface ComplianceSnapshot {
  readonly asOf: string;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly requirements: readonly ComplianceRequirement[];
  readonly certificates: readonly CertificateRecord[];
  readonly certificateTypes: readonly CertificateTypeRecord[];
}

export class CertificateReferenceConflictError extends Error {
  constructor() {
    super('This certificate reference is already recorded for this vessel and type.');
    this.name = 'CertificateReferenceConflictError';
  }
}

export class CertificateTypeNotFoundError extends Error {
  constructor() {
    super('Select an available certificate type.');
    this.name = 'CertificateTypeNotFoundError';
  }
}

export class CertificateNotFoundError extends Error {
  constructor() {
    super('The requested certificate was not found.');
    this.name = 'CertificateNotFoundError';
  }
}

export class CertificateArchivedError extends Error {
  constructor() {
    super('Archived certificates cannot be changed.');
    this.name = 'CertificateArchivedError';
  }
}

export function normalizeCertificateText(value: string): string {
  return value.trim();
}

export function normalizeCertificateTypeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function formatCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function utcCalendarDate(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  );
}

function latestCertificate(
  certificates: readonly CertificateRecord[],
): CertificateRecord | null {
  return (
    [...certificates].sort(
      (left, right) =>
        right.expiresOn.getTime() - left.expiresOn.getTime() ||
        right.issuedOn.getTime() - left.issuedOn.getTime() ||
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id.localeCompare(left.id),
    )[0] ?? null
  );
}

function requirementFor(
  certificateType: CertificateTypeRecord,
  certificates: readonly CertificateRecord[],
  asOf: Date,
): ComplianceRequirement {
  const certificate = latestCertificate(
    certificates.filter(
      (item) =>
        item.certificateTypeId === certificateType.id &&
        item.archivedAt === null &&
        item.issuedOn.getTime() <= asOf.getTime(),
    ),
  );
  if (!certificate) {
    return {
      certificateType,
      status: 'MISSING',
      reason: `${certificateType.name} is missing.`,
      certificate: null,
    };
  }

  const daysRemaining = Math.round(
    (certificate.expiresOn.getTime() - asOf.getTime()) / MILLISECONDS_PER_DAY,
  );
  const expiresOn = formatCalendarDate(certificate.expiresOn);
  if (daysRemaining < 0) {
    return {
      certificateType,
      status: 'EXPIRED',
      reason: `${certificateType.name} expired on ${expiresOn}.`,
      certificate,
    };
  }
  if (daysRemaining <= 30) {
    const unit = daysRemaining === 1 ? 'day' : 'days';
    return {
      certificateType,
      status: 'EXPIRING_SOON',
      reason: `${certificateType.name} expires in ${daysRemaining} ${unit}, on ${expiresOn}.`,
      certificate,
    };
  }
  return {
    certificateType,
    status: 'VALID',
    reason: `${certificateType.name} is valid until ${expiresOn}.`,
    certificate,
  };
}

const STATUS_PRIORITY: Readonly<Record<ComplianceStatus, number>> = {
  MISSING: 4,
  EXPIRED: 3,
  EXPIRING_SOON: 2,
  VALID: 1,
};

export function deriveComplianceSnapshot(input: {
  readonly certificateTypes: readonly CertificateTypeRecord[];
  readonly certificates: readonly CertificateRecord[];
  readonly asOf: Date;
}): ComplianceSnapshot {
  const asOf = utcCalendarDate(input.asOf);
  const requirements = input.certificateTypes
    .filter((item) => item.isRequired)
    .map((item) => requirementFor(item, input.certificates, asOf));
  const worst = [...requirements].sort(
    (left, right) => STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status],
  )[0];

  return {
    asOf: formatCalendarDate(asOf),
    status: worst?.status ?? 'VALID',
    reason: worst?.reason ?? 'No required certificate types are configured.',
    requirements,
    certificates: input.certificates,
    certificateTypes: input.certificateTypes,
  };
}
