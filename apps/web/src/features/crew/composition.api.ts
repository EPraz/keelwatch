import { expectCrewJson } from './crew.api';
import type { CrewComposition } from './composition.types';

export interface CompositionQuery {
  readonly date: string;
  readonly role: string;
  readonly page: number;
}
const root = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');
export async function getComposition(
  token: string,
  vesselId: string,
  query: CompositionQuery,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(query.page) });
  if (query.date) params.set('date', query.date);
  if (query.role) params.set('role', query.role);
  return expectCrewJson<CrewComposition>(
    await fetch(
      `${root}/vessels/${encodeURIComponent(vesselId)}/crew-composition?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    ),
  );
}
