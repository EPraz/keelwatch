import { describe, expect, it } from 'vitest';
import {
  parseQualificationDate,
  qualificationView,
  type QualificationRecord,
} from './qualification';

const record: QualificationRecord = {
  id: 'qualification',
  crewMemberId: 'crew',
  kind: 'DEMO_SAFETY',
  referenceNumber: 'KW-Q-000001',
  validFrom: new Date('2026-10-01'),
  expiresOn: new Date('2026-11-05'),
  createdAt: new Date('2026-10-01'),
};
describe('Demo qualification validity', () => {
  it.each([
    '0000-01-01',
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-10-06T00:00:00Z',
    'bad',
  ])('rejects an impossible or non-calendar date %s', (value) =>
    expect(parseQualificationDate(value)).toBeNull(),
  );
  it('accepts leap days and preserves UTC dates', () => {
    expect(parseQualificationDate('2028-02-29')?.toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });
  it.each([
    ['2026-09-30', 'NOT_YET_VALID'],
    ['2026-10-01', 'VALID'],
    ['2026-10-05', 'VALID'],
    ['2026-10-06', 'EXPIRING_SOON'],
    ['2026-11-05', 'EXPIRING_SOON'],
    ['2026-11-06', 'EXPIRED'],
  ])('derives %s as %s including the expiry day', (day, status) => {
    expect(qualificationView(record, new Date(`${day}T23:59:59Z`))).toMatchObject({
      asOf: day,
      status,
    });
  });
});
