import { describe, expect, it } from 'vitest';
import { certificateTypes } from './seed-catalog.mjs';

describe('certificate catalog seed', () => {
  it('contains the required synthetic safety-equipment type', () => {
    expect(certificateTypes).toEqual([
      {
        code: 'SAFETY_EQUIPMENT',
        name: 'Safety equipment certificate',
        isRequired: true,
      },
    ]);
  });
});
