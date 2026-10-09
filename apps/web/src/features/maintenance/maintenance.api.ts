import type { MaintenanceOrder, MaintenanceTransitionInput } from './maintenance.types';

export interface MaintenanceInput {
  title: string;
  category: MaintenanceOrder['category'];
  priority: MaintenanceOrder['priority'];
  assigneeId: string | null;
  targetDate: string | null;
}
export class MaintenanceApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId?: string,
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>,
  ) {
    super(message);
  }
}
const root = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');
export const maintenancePath = (vesselId: string) =>
  `/vessels/${encodeURIComponent(vesselId)}/maintenance-orders`;
async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      correlationId?: string;
      fieldErrors?: Readonly<Record<string, readonly string[]>>;
    };
    throw new MaintenanceApiError(
      response.status,
      body.code ?? 'REQUEST_FAILED',
      body.message ?? 'The maintenance request could not be completed.',
      body.correlationId ?? response.headers.get('x-correlation-id') ?? undefined,
      body.fieldErrors,
    );
  }
  return (await response.json()) as T;
}
export async function readMaintenance<T>(
  token: string,
  path: string,
  signal: AbortSignal,
) {
  return expectJson<T>(
    await fetch(`${root}${path}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
}
export async function saveMaintenance(
  token: string,
  path: string,
  input: MaintenanceInput & { expectedRevision?: number },
  signal: AbortSignal,
) {
  return expectJson<MaintenanceOrder>(
    await fetch(`${root}${path}`, {
      method: input.expectedRevision === undefined ? 'POST' : 'PUT',
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

export async function transitionMaintenance(
  token: string,
  path: string,
  input: MaintenanceTransitionInput,
  signal: AbortSignal,
) {
  return expectJson<MaintenanceOrder>(
    await fetch(`${root}${path}/transitions`, {
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
