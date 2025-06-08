import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'coverage/', '**/*.d.ts', 'tests/', 'vitest.config.ts'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
