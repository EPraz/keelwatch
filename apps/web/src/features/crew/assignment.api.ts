import { expectCrewJson } from './crew.api';

export interface AssignmentInput {
  readonly crewNumber: string;
  readonly role: string;
  readonly startsOn: string;
  readonly endsOn: string;
}
export interface Assignment extends AssignmentInput {
  readonly id: string;
  readonly crewMemberId: string;
  readonly displayName: string;
  readonly roleLabel: string;
  readonly createdAt: string;
  readonly status: 'SCHEDULED' | 'CURRENT' | 'ENDED' | 'CANCELLED';
  readonly asOf: string;
  readonly cancellation: {
    readonly reason: string;
    readonly reasonLabel: string;
    readonly cancelledAt: string;
  } | null;
}
export interface AssignmentWorkspace {
  readonly vessel: { readonly id: string; readonly status: 'ACTIVE' | 'ARCHIVED' };
  readonly items: readonly Assignment[];
  readonly asOf: string;
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
}
const root = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');
const path = (vesselId: string) =>
  `${root}/vessels/${encodeURIComponent(vesselId)}/crew-assignments`;
export async function getAssignments(
  token: string,
  vesselId: string,
  page: number,
  signal: AbortSignal,
) {
  return expectCrewJson<AssignmentWorkspace>(
    await fetch(`${path(vesselId)}?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }),
  );
}
export async function createAssignment(
  token: string,
  vesselId: string,
  input: AssignmentInput,
  signal: AbortSignal,
) {
  return expectCrewJson<Assignment>(
    await fetch(path(vesselId), {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(input),
    }),
  );
}
export async function cancelAssignment(
  token: string,
  vesselId: string,
  assignmentId: string,
  reason: string,
  signal: AbortSignal,
) {
  return expectCrewJson<Assignment>(
    await fetch(`${path(vesselId)}/${encodeURIComponent(assignmentId)}/cancellation`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({ reason }),
    }),
  );
}
