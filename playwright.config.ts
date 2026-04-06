import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for OpenMarcus e2e tests
 * 
 * Tests the full user journey: profile → meditation → conversation → summary → history
 * 
 * The Vite dev server (port 3101) proxies /api requests to the backend (port 3100).
 * This config runs tests sequentially to prevent database conflicts.
 * Services should be started separately before running tests.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Tests share the same database, run sequentially
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to prevent database conflicts
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
