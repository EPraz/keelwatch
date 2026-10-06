export const QUALIFICATION_KINDS = ['DEMO_SAFETY', 'DEMO_DECK'] as const;
export type QualificationKind = (typeof QUALIFICATION_KINDS)[number];
export const QUALIFICATION_LABELS: Readonly<Record<QualificationKind, string>> = {
  DEMO_SAFETY: 'Safety familiarization (demo)',
  DEMO_DECK: 'Deck operations (demo)',
};
export type QualificationStatus = 'NOT_YET_VALID' | 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';

export interface QualificationRecord {
  readonly id: string;
  readonly crewMemberId: string;
  readonly kind: QualificationKind;
  readonly referenceNumber: string;
  readonly validFrom: Date;
  readonly expiresOn: Date;
  readonly createdAt: Date;
}

export class QualificationConflictError extends Error {}
export class CrewMemberNotFoundError extends Error {}

export function parseQualificationDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith('0000-')) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return null;
  return date;
}

export function qualificationView(record: QualificationRecord, instant: Date) {
  const asOf = instant.toISOString().slice(0, 10);
  const validFrom = record.validFrom.toISOString().slice(0, 10);
  const expiresOn = record.expiresOn.toISOString().slice(0, 10);
  let status: QualificationStatus = 'VALID';
  let reason = `Valid through ${expiresOn}.`;
  if (validFrom > asOf) {
    status = 'NOT_YET_VALID';
    reason = `Validity starts on ${validFrom}.`;
  } else if (expiresOn < asOf) {
    status = 'EXPIRED';
    reason = `Expired on ${expiresOn}.`;
  } else if (
    (record.expiresOn.getTime() - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000 <=
    30
  ) {
    status = 'EXPIRING_SOON';
    reason = `Expires on ${expiresOn}, within 30 days.`;
  }
  return {
    id: record.id,
    kind: record.kind,
    kindLabel: QUALIFICATION_LABELS[record.kind],
    referenceNumber: record.referenceNumber,
    validFrom,
    expiresOn,
    createdAt: record.createdAt.toISOString(),
    status,
    reason,
    asOf,
  };
}
