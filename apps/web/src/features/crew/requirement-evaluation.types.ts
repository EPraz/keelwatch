// Generated from the evaluation OpenAPI response; do not edit manually.
// Checked by requirement-evaluation.postgres.integration.spec.ts.
export type RequirementEvaluation = {
  readonly vesselId: string;
  readonly crewMemberId: string;
  readonly crewNumber: string;
  readonly displayName: string;
  readonly role: 'DEMO_DECK' | 'DEMO_SUPPORT';
  readonly startsOn: string;
  readonly endsOn: string;
  readonly consultedAt: string;
  readonly status: 'INCOMPLETE' | 'WARNING' | 'COVERED';
  readonly requirements: readonly {
    readonly kind: 'DEMO_SAFETY' | 'DEMO_DECK';
    readonly kindLabel: string;
    readonly status: 'INCOMPLETE' | 'WARNING' | 'COVERED';
    readonly reasonCode:
      'NO_RECORDS' | 'COVERAGE_GAP' | 'COVERAGE_ENDING_SOON' | 'FULL_PERIOD_COVERED';
    readonly reason: string;
    readonly firstGap: { readonly startsOn: string; readonly endsOn: string } | null;
    readonly coverageEndsOn: string | null;
  }[];
};
export type EvaluationStatus = RequirementEvaluation['status'];
