import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.integration.spec.ts'],
    exclude: ['test/**/*.postgres.integration.spec.ts'],
    testTimeout: 10_000,
  },
});
