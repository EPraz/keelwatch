export const DEMO_AUDITOR_SUBJECT = 'demo:auditor';
export const DEMO_TOKEN_PREFIX = 'demo.';

export function isDemoSubject(subject: string): boolean {
  return subject.startsWith('demo:');
}
