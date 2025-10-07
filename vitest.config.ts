import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: [
      'server/tests/**/*.spec.ts',
      'server/tests/**/*.test.ts',
    ],
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
});
