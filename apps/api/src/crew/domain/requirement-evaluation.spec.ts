import { describe, expect, it } from 'vitest';
import {
  evaluateRequirements,
  type QualificationInterval,
} from './requirement-evaluation';
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const safety = (start: string, end: string): QualificationInterval => ({
  kind: 'DEMO_SAFETY',
  validFrom: date(start),
  expiresOn: date(end),
});
const evaluate = (
  records: readonly QualificationInterval[],
  start = '2040-01-01',
  end = '2040-01-31',
) => evaluateRequirements('DEMO_SUPPORT', date(start), date(end), records);
describe('Demo full-period coverage', () => {
  it.each([
    ['2040-01-31', 'WARNING'],
    ['2040-02-01', 'WARNING'],
    ['2040-03-01', 'WARNING'],
    ['2040-03-02', 'COVERED'],
  ])(
    'uses effective coverage through %s for the inclusive warning boundary',
    (end, status) => {
      expect(evaluate([safety('2040-01-01', end)])).toMatchObject({
        status,
        requirements: [{ status, firstGap: null, coverageEndsOn: end }],
      });
    },
  );
  it.each([
    [[], '2040-01-01', '2040-01-31', 'NO_RECORDS'],
    [[safety('2040-01-03', '2040-02-01')], '2040-01-01', '2040-01-02', 'COVERAGE_GAP'],
    [
      [
        safety('2040-01-01', '2040-01-15'),
        safety('2040-01-17', '2040-01-20'),
        safety('2040-01-23', '2040-02-01'),
      ],
      '2040-01-16',
      '2040-01-16',
      'COVERAGE_GAP',
    ],
    [
      [safety('2040-01-01', '2040-01-15'), safety('2040-01-20', '2040-02-01')],
      '2040-01-16',
      '2040-01-19',
      'COVERAGE_GAP',
    ],
    [[safety('2040-01-01', '2040-01-29')], '2040-01-30', '2040-01-31', 'COVERAGE_GAP'],
    [
      [safety('2039-01-01', '2039-12-31'), safety('2041-01-01', '2041-12-31')],
      '2040-01-01',
      '2040-01-31',
      'COVERAGE_GAP',
    ],
  ] as const)(
    'explains the first maximal gap (case %j)',
    (records, start, end, reasonCode) => {
      expect(evaluate(records)).toMatchObject({
        status: 'INCOMPLETE',
        requirements: [
          {
            reasonCode,
            firstGap: { startsOn: start, endsOn: end },
            coverageEndsOn: null,
          },
        ],
      });
    },
  );
  it('is insensitive to order, nesting and duplicates, with consecutive extensions beyond plan end', () => {
    const records = [
      safety('2040-02-01', '2040-03-10'),
      safety('2040-01-16', '2040-01-31'),
      safety('2040-01-01', '2040-01-15'),
      safety('2040-01-03', '2040-01-04'),
      safety('2040-01-01', '2040-01-15'),
    ];
    expect(evaluate(records)).toEqual(evaluate([...records].reverse()));
    expect(evaluate(records)).toMatchObject({
      status: 'COVERED',
      requirements: [{ coverageEndsOn: '2040-03-10' }],
    });
  });
  it('does not extend a warning across a gap after the plan', () => {
    expect(
      evaluate([safety('2040-01-01', '2040-01-31'), safety('2040-02-02', '2041-01-01')]),
    ).toMatchObject({
      status: 'WARNING',
      requirements: [{ coverageEndsOn: '2040-01-31' }],
    });
  });
  it('requires distinct types and gives incomplete precedence over a warning', () => {
    const records = [safety('2040-01-01', '2040-01-31')];
    expect(
      evaluateRequirements('DEMO_DECK', date('2040-01-01'), date('2040-01-31'), records),
    ).toMatchObject({
      status: 'INCOMPLETE',
      requirements: [
        { status: 'WARNING' },
        { kind: 'DEMO_DECK', reasonCode: 'NO_RECORDS' },
      ],
    });
    const deck: QualificationInterval = {
      ...safety('2040-01-01', '2041-01-01'),
      kind: 'DEMO_DECK',
    };
    expect(
      evaluateRequirements('DEMO_DECK', date('2040-01-01'), date('2040-01-31'), [
        ...records,
        deck,
      ]),
    ).toMatchObject({ status: 'WARNING' });
    expect(evaluate([deck])).toMatchObject({
      status: 'INCOMPLETE',
      requirements: [{ reasonCode: 'NO_RECORDS' }],
    });
  });
  it.each([
    ['0001-01-01', '9999-12-31'],
    ['9999-12-31', '9999-12-31'],
    ['0001-01-01', '0001-01-01'],
    ['2000-02-28', '2000-03-01'],
  ])(
    'handles calendar extremes and long periods without daily iteration: %s to %s',
    (start, end) => {
      expect(evaluate([safety(start, end)], start, end)).toMatchObject({
        status: 'WARNING',
        requirements: [{ firstGap: null, coverageEndsOn: end }],
      });
    },
  );
  it('merges renewals across leap day and year boundaries', () => {
    expect(
      evaluate(
        [safety('1999-12-31', '2000-02-28'), safety('2000-02-29', '2000-03-02')],
        '1999-12-31',
        '2000-03-01',
      ),
    ).toMatchObject({ status: 'WARNING', requirements: [{ firstGap: null }] });
  });
});
