import { describe, expect, it } from 'vitest';
import { normalizeRegistryNumber, normalizeVesselName } from './vessel';

describe('vessel normalization', () => {
  it('trims vessel names without changing their case', () => {
    expect(normalizeVesselName('  MV Northwind  ')).toBe('MV Northwind');
  });

  it('trims and uppercases registry numbers', () => {
    expect(normalizeRegistryNumber('  kw-000001  ')).toBe('KW-000001');
  });
});
