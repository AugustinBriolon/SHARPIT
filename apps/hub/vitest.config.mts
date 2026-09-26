import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Route tests pay a cold dynamic-import cost; under pre-commit load (lint +
    // typecheck racing the suite) the default 5s flakes on the first `it` of a file.
    testTimeout: 15_000,
    hookTimeout: 20_000,
  },
});
