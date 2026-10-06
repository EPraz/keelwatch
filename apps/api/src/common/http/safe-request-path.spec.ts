import { describe, expect, it } from 'vitest';
import { safeRequestPath } from './safe-request-path';

describe('safe request paths', () => {
  it('redacts tokens even when a caller uses a retired download route', () => {
    expect(safeRequestPath('/api/v1/document-downloads/retired-token?token=secret')).toBe(
      '/api/v1/document-downloads/:token',
    );
    expect(safeRequestPath('/api/v1/compliance?search=private-value')).toBe(
      '/api/v1/compliance',
    );
  });
});
