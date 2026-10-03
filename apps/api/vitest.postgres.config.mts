import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.postgres.integration.spec.ts'],
    testTimeout: 15_000,
    env: { RUN_POSTGRES_TESTS: 'true' },
  },
});
