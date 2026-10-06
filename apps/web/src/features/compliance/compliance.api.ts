import type {
  ComplianceApiErrorBody,
  ComplianceQueuePage,
  ComplianceQueueQuery,
  ComplianceWorkspace,
  CreateCertificateInput,
  NotificationJobRun,
  NotificationWatch,
} from './compliance.types';

const apiRoot = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');

function isApiErrorBody(value: unknown): value is ComplianceApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

export async function listComplianceQueue(
  accessToken: string,
  signal: AbortSignal,
  query: ComplianceQueueQuery,
): Promise<ComplianceQueuePage> {
  const params = new URLSearchParams({ page: String(query.page) });
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  const response = await fetch(`${apiRoot}/compliance?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<ComplianceQueuePage>(response);
}

export async function getNotificationWatch(
  accessToken: string,
  signal: AbortSignal,
): Promise<NotificationWatch> {
  const response = await fetch(`${apiRoot}/compliance/notifications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<NotificationWatch>(response);
}

export async function enqueueNotificationJob(
  accessToken: string,
  signal: AbortSignal,
): Promise<NotificationJobRun> {
  const response = await fetch(`${apiRoot}/compliance/notification-jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Correlation-Id': crypto.randomUUID(),
    },
    signal,
  });
  return expectJson<NotificationJobRun>(response);
}

export async function getNotificationJob(
  accessToken: string,
  jobRunId: string,
  signal: AbortSignal,
): Promise<NotificationJobRun> {
  const response = await fetch(`${apiRoot}/compliance/notification-jobs/${jobRunId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<NotificationJobRun>(response);
}

export class ComplianceApiError extends Error {
  constructor(
    readonly httpStatus: number | undefined,
    readonly body: ComplianceApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ComplianceApiError';
  }
}

async function readError(response: Response): Promise<ComplianceApiErrorBody> {
  const body: unknown = await response.json().catch(() => null);
  if (isApiErrorBody(body)) return body;
  return {
    code: 'REQUEST_FAILED',
    message: 'Keelwatch could not complete the Compliance request.',
    correlationId: response.headers.get('x-correlation-id') ?? undefined,
  };
}

export async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ComplianceApiError(response.status, await readError(response));
  }
  return (await response.json()) as T;
}

export async function getComplianceWorkspace(
  accessToken: string,
  vesselId: string,
  signal: AbortSignal,
): Promise<ComplianceWorkspace> {
  const response = await fetch(`${apiRoot}/vessels/${vesselId}/compliance`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });
  return expectJson<ComplianceWorkspace>(response);
}

export async function createCertificate(
  accessToken: string,
  vesselId: string,
  input: CreateCertificateInput,
): Promise<ComplianceWorkspace> {
  const response = await fetch(`${apiRoot}/vessels/${vesselId}/certificates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Correlation-Id': crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  return expectJson<ComplianceWorkspace>(response);
}

export async function updateCertificate(
  accessToken: string,
  vesselId: string,
  certificateId: string,
  input: CreateCertificateInput,
): Promise<ComplianceWorkspace> {
  const response = await fetch(
    `${apiRoot}/vessels/${vesselId}/certificates/${certificateId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
      },
      body: JSON.stringify(input),
    },
  );
  return expectJson<ComplianceWorkspace>(response);
}

export async function archiveCertificate(
  accessToken: string,
  vesselId: string,
  certificateId: string,
): Promise<ComplianceWorkspace> {
  const response = await fetch(
    `${apiRoot}/vessels/${vesselId}/certificates/${certificateId}/archive`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Correlation-Id': crypto.randomUUID(),
      },
    },
  );
  return expectJson<ComplianceWorkspace>(response);
}
