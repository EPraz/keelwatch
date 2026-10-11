export interface DemoSessionRecord {
  readonly accessToken: string;
  readonly expiresAt: string;
}

const SESSION_KEY = 'keelwatch.demo-session';

export function isDemoSession(value: unknown): value is DemoSessionRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    value.accessToken.startsWith('demo.') &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'string' &&
    Number.isFinite(Date.parse(value.expiresAt))
  );
}

export function readDemoSession(): DemoSessionRecord | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    if (isDemoSession(value) && Date.parse(value.expiresAt) > Date.now()) return value;
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* An unavailable or corrupt session cannot authenticate the visitor. */
  }
  return null;
}

export function saveDemoSession(session: DemoSessionRecord | null): void {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}
