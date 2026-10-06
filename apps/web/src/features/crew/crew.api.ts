import type {
  Qualification,
  QualificationInput,
  QualificationWorkspace,
} from './qualification.types';

const apiRoot = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');

export interface CrewMember {
  readonly id: string;
  readonly displayName: string;
  readonly crewNumber: string;
  readonly createdAt: string;
}

export interface CrewPage {
  readonly items: readonly CrewMember[];
  readonly total: number;
  readonly page: number;
  readonly totalPages: number;
}

export class CrewApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly correlationId?: string,
  ) {
    super(message);
  }
}

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'The Crew request could not be completed.';
    throw new CrewApiError(
      response.status,
      message,
      response.headers.get('x-correlation-id') ?? undefined,
    );
  }
  return (await response.json()) as T;
}

export async function listCrew(token: string, page: number, signal: AbortSignal) {
  return expectJson<CrewPage>(
    await fetch(`${apiRoot}/crew-members?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }),
  );
}

export async function registerCrew(
  token: string,
  input: { displayName: string; crewNumber: string },
) {
  return expectJson<CrewMember>(
    await fetch(`${apiRoot}/crew-members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function getQualifications(
  token: string,
  crewMemberId: string,
  page: number,
  signal: AbortSignal,
) {
  return expectJson<QualificationWorkspace>(
    await fetch(
      `${apiRoot}/crew-members/${encodeURIComponent(crewMemberId)}/qualifications?page=${page}`,
      { headers: { Authorization: `Bearer ${token}` }, signal },
    ),
  );
}

export async function recordQualification(
  token: string,
  crewMemberId: string,
  input: QualificationInput,
  signal: AbortSignal,
) {
  return expectJson<Qualification>(
    await fetch(
      `${apiRoot}/crew-members/${encodeURIComponent(crewMemberId)}/qualifications`,
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Correlation-Id': crypto.randomUUID(),
        },
        body: JSON.stringify(input),
      },
    ),
  );
}
