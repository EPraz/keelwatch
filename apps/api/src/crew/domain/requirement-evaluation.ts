import type { AssignmentRole } from './assignment';
import { QUALIFICATION_LABELS, type QualificationKind } from './qualification';

export const EVALUATION_STATUSES = ['INCOMPLETE', 'WARNING', 'COVERED'] as const;
export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];
export interface QualificationInterval {
  readonly kind: QualificationKind;
  readonly validFrom: Date;
  readonly expiresOn: Date;
}
export function requiredKinds(role: AssignmentRole): readonly QualificationKind[] {
  return role === 'DEMO_DECK' ? ['DEMO_SAFETY', 'DEMO_DECK'] : ['DEMO_SAFETY'];
}
const day = 86_400_000;
const calendar = (instant: number) => new Date(instant).toISOString().slice(0, 10);

function evaluateRequirement(
  kind: QualificationKind,
  startsOn: Date,
  endsOn: Date,
  evidence: readonly QualificationInterval[],
) {
  const records = evidence
    .filter((record) => record.kind === kind)
    .map((record) => ({
      start: record.validFrom.getTime(),
      end: record.expiresOn.getTime(),
    }))
    .sort((left, right) => left.start - right.start);
  const intervals: { start: number; end: number }[] = [];
  for (const record of records) {
    const previous = intervals.at(-1);
    if (previous && record.start <= previous.end + day)
      previous.end = Math.max(previous.end, record.end);
    else intervals.push({ ...record });
  }
  const start = startsOn.getTime();
  const end = endsOn.getTime();
  let cursor = start;
  for (const interval of intervals) {
    if (interval.end < cursor) continue;
    if (interval.start > end || interval.start > cursor) break;
    if (interval.end >= end) {
      const warning = (interval.end - end) / day <= 30;
      return {
        kind,
        kindLabel: QUALIFICATION_LABELS[kind],
        status: warning ? ('WARNING' as const) : ('COVERED' as const),
        reasonCode: warning ? 'COVERAGE_ENDING_SOON' : 'FULL_PERIOD_COVERED',
        reason: `The full planned period is covered through ${calendar(interval.end)}.${warning ? ' Coverage ends within 30 days after the plan.' : ''}`,
        firstGap: null,
        coverageEndsOn: calendar(interval.end),
      };
    }
    cursor = interval.end + day;
  }
  const next = intervals.find((interval) => interval.start > cursor);
  const gapEnd = Math.min(end, next ? next.start - day : end);
  const firstGap = { startsOn: calendar(cursor), endsOn: calendar(gapEnd) };
  return {
    kind,
    kindLabel: QUALIFICATION_LABELS[kind],
    status: 'INCOMPLETE' as const,
    reasonCode: records.length ? 'COVERAGE_GAP' : 'NO_RECORDS',
    reason: records.length
      ? `Coverage is missing from ${firstGap.startsOn} through ${firstGap.endsOn}.`
      : 'No records of this required demo qualification.',
    firstGap,
    coverageEndsOn: null,
  };
}

export function evaluateRequirements(
  role: AssignmentRole,
  startsOn: Date,
  endsOn: Date,
  evidence: readonly QualificationInterval[],
) {
  const requirements = requiredKinds(role).map((kind) =>
    evaluateRequirement(kind, startsOn, endsOn, evidence),
  );
  let status: EvaluationStatus = 'COVERED';
  if (requirements.some((item) => item.status === 'INCOMPLETE')) status = 'INCOMPLETE';
  else if (requirements.some((item) => item.status === 'WARNING')) status = 'WARNING';
  return { status, requirements };
}
