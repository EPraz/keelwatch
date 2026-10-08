export const ASSIGNMENT_ROLES = ['DEMO_DECK', 'DEMO_SUPPORT'] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];
export const CANCELLATION_REASONS = ['INCORRECT_RECORD', 'PLAN_CHANGED'] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
const cancellationLabels: Readonly<Record<CancellationReason, string>> = {
  INCORRECT_RECORD: 'Incorrect record',
  PLAN_CHANGED: 'Plan changed',
};
const labels: Readonly<Record<AssignmentRole, string>> = {
  DEMO_DECK: 'Deck role (demo)',
  DEMO_SUPPORT: 'Support role (demo)',
};
export interface AssignmentRecord {
  readonly id: string;
  readonly crewMemberId: string;
  readonly vesselId: string;
  readonly role: AssignmentRole;
  readonly startsOn: Date;
  readonly endsOn: Date;
  readonly createdAt: Date;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: CancellationReason | null;
  readonly member: { readonly displayName: string; readonly crewNumber: string };
}
export class AssignmentOverlapError extends Error {}
export class AssignmentCrewNotFoundError extends Error {}
export class AssignmentNotFoundError extends Error {}
export class AssignmentCancellationConflictError extends Error {}

export function assignmentView(record: AssignmentRecord, now: Date) {
  const asOf = now.toISOString().slice(0, 10);
  const startsOn = record.startsOn.toISOString().slice(0, 10);
  const endsOn = record.endsOn.toISOString().slice(0, 10);
  let status = 'CURRENT';
  if (record.cancelledAt) status = 'CANCELLED';
  else if (startsOn > asOf) status = 'SCHEDULED';
  else if (endsOn < asOf) status = 'ENDED';
  return {
    id: record.id,
    crewMemberId: record.crewMemberId,
    displayName: record.member.displayName,
    crewNumber: record.member.crewNumber,
    role: record.role,
    roleLabel: labels[record.role],
    startsOn,
    endsOn,
    createdAt: record.createdAt.toISOString(),
    status,
    asOf,
    cancellation:
      record.cancelledAt && record.cancellationReason
        ? {
            cancelledAt: record.cancelledAt.toISOString(),
            reason: record.cancellationReason,
            reasonLabel: cancellationLabels[record.cancellationReason],
          }
        : null,
  };
}
