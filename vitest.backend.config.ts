import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/**/*.{test,spec}.{js,mjs,cjs,ts,mts,tsx,jsx}'],
    maxWorkers: 10,
    minWorkers: 1,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
