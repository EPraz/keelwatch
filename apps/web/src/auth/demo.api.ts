import { isDemoSession, type DemoSessionRecord } from './demo-session-storage';

const apiRoot = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');

export class DemoApiError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DemoApiError';
  }
}

async function readJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      typeof body.code === 'string' &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      throw new DemoApiError(response.status, body.code, body.message);
    }
    throw new DemoApiError(
      response.status,
      'DEMO_REQUEST_FAILED',
      'Demo access could not be opened. Please try again.',
    );
  }
  return body;
}

export async function loadDemoRoles(signal: AbortSignal): Promise<readonly 'auditor'[]> {
  const body = await readJson(
    await fetch(`${apiRoot}/access/demo`, { signal, cache: 'no-store' }),
  );
  if (
    typeof body !== 'object' ||
    body === null ||
    !('availableRoles' in body) ||
    !Array.isArray(body.availableRoles)
  )
    throw new Error('Demo availability could not be checked.');
  return body.availableRoles.includes('auditor') ? ['auditor'] : [];
}

export async function issueDemoSession(signal: AbortSignal): Promise<DemoSessionRecord> {
  const body = await readJson(
    await fetch(`${apiRoot}/access/demo/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'auditor' }),
      signal,
      cache: 'no-store',
    }),
  );
  if (!isDemoSession(body) || Date.parse(body.expiresAt) <= Date.now())
    throw new Error('Demo sign-in returned an invalid session.');
  return body;
}
