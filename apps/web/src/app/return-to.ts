const RETURN_TO_KEY = 'keelwatch.return-to';

export function rememberReturnTo(returnTo: string): void {
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);
}

export function consumeReturnTo(fallback = '/app'): string {
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? fallback;
  sessionStorage.removeItem(RETURN_TO_KEY);
  return returnTo.startsWith('/app') ? returnTo : fallback;
}
