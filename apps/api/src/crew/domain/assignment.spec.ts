import { describe, expect, it } from 'vitest';
import { assignmentView, type AssignmentRecord } from './assignment';

const record: AssignmentRecord = {
  id: 'plan',
  crewMemberId: 'member',
  vesselId: 'vessel',
  role: 'DEMO_DECK',
  startsOn: new Date('2026-10-08T00:00:00Z'),
  endsOn: new Date('2026-10-10T00:00:00Z'),
  createdAt: new Date('2026-10-01T00:00:00Z'),
  cancelledAt: null,
  cancellationReason: null,
  member: { displayName: 'Synthetic Planner', crewNumber: 'KW-C-000001' },
};
describe('Assignment status by UTC calendar day', () => {
  it.each([
    ['2026-10-07T23:59:59Z', '2026-10-07', 'SCHEDULED'],
    ['2026-10-08T00:00:00Z', '2026-10-08', 'CURRENT'],
    ['2026-10-10T23:59:59Z', '2026-10-10', 'CURRENT'],
    ['2026-10-11T00:00:00Z', '2026-10-11', 'ENDED'],
    ['2026-10-07T20:00:00-05:00', '2026-10-08', 'CURRENT'],
    ['2026-10-11T01:00:00+02:00', '2026-10-10', 'CURRENT'],
  ])('evaluates %s as %s/%s', (instant, asOf, status) => {
    expect(assignmentView(record, new Date(instant))).toMatchObject({ asOf, status });
    expect(
      assignmentView(
        {
          ...record,
          cancelledAt: new Date('2026-10-01'),
          cancellationReason: 'PLAN_CHANGED',
        },
        new Date(instant),
      ),
    ).toMatchObject({
      asOf,
      status: 'CANCELLED',
      startsOn: '2026-10-08',
      endsOn: '2026-10-10',
    });
  });
});
