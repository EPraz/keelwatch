export function safeRequestPath(originalUrl: string): string {
  return originalUrl
    .split('?')[0]!
    .replace(/\/document-downloads\/[^/]+/u, '/document-downloads/:token');
}
