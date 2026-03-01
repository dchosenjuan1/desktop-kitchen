import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // All tests share a single database — must run sequentially
    fileParallelism: false,
    sequence: { concurrent: false },
    // Global setup/teardown for test tenant lifecycle
    globalSetup: ['./tests/setup/global-setup.ts'],
    // Run test files in deterministic order
    include: [
      'tests/personas/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/modules/**/*.test.ts',
      'tests/security/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.js'],
      exclude: ['server/db/migrations/**', 'server/ai/**'],
    },
  },
});
