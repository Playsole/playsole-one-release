import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['tests/**/*.test.ts'],
  },
});
