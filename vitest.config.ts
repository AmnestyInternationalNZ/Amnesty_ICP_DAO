import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/backend/global-setup.ts'],
    include: ['tests/backend/backend.integration.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
