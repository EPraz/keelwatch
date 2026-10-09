import type { AssignmentInput } from './assignment.api';
import { expectCrewJson } from './crew.api';
import type { RequirementEvaluation } from './requirement-evaluation.types';
const root = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');
export async function evaluateDraft(
  token: string,
  vesselId: string,
  input: AssignmentInput,
  signal: AbortSignal,
) {
  const query = new URLSearchParams({ ...input });
  return expectCrewJson<RequirementEvaluation>(
    await fetch(
      `${root}/vessels/${encodeURIComponent(vesselId)}/crew-assignments/requirement-evaluation?${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Correlation-Id': crypto.randomUUID(),
        },
        signal,
      },
    ),
  );
}
