import type {
  CreateVesselInput,
  FleetApiErrorBody,
  Vessel,
  VesselDetail,
  VesselPage,
  UpdateVesselInput,
} from './fleet.types';

const apiRoot = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');

function isFleetApiErrorBody(value: unknown): value is FleetApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

export class FleetApiError extends Error {
  constructor(
    readonly httpStatus: number | undefined,
    readonly body: FleetApiErrorBody,
  ) {
    super(body.message);
    this.name = 'FleetApiError';
  }
}

async function readError(response: Response): Promise<FleetApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  if (isFleetApiErrorBody(body)) return body;
  return {
    code: 'REQUEST_FAILED',
    message: 'Keelwatch could not complete the Fleet request.',
    correlationId: response.headers.get('x-correlation-id') ?? undefined,
  };
}

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new FleetApiError(response.status, await readError(response));
  return (await response.json()) as T;
}

export async function listVessels(
  accessToken: string,
  signal: AbortSignal,
  page = 1,
): Promise<VesselPage> {
  const response = await fetch(`${apiRoot}/vessels?page=${page}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<VesselPage>(response);
}

export async function createVessel(
  accessToken: string,
  input: CreateVesselInput,
): Promise<Vessel> {
  const response = await fetch(`${apiRoot}/vessels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  return expectJson<Vessel>(response);
}

export async function getVessel(
  accessToken: string,
  vesselId: string,
  signal: AbortSignal,
): Promise<VesselDetail> {
  const response = await fetch(`${apiRoot}/vessels/${vesselId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<VesselDetail>(response);
}

export async function updateVessel(
  accessToken: string,
  vesselId: string,
  input: UpdateVesselInput,
): Promise<Vessel> {
  const response = await fetch(`${apiRoot}/vessels/${vesselId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  return expectJson<Vessel>(response);
}
