/**
 * E2E Test Setup
 * 
 * Common setup for all e2e tests to ensure database isolation.
 * Import this in your test files to get automatic database clearing.
 */

import { test as base } from '@playwright/test';
import { clearTestData, setAuthToken, clearAuthToken, registerTestUser } from './test-db-helpers';

// Extend Playwright test with custom fixtures
export const test = base.extend({
  // Clear database before each test
  page: async ({ page }, use) => {
    // Clear all test data before each test
    await clearTestData();
    await use(page);
  },
});

// Helper to create authenticated page for tests
export async function createAuthenticatedPage(page: any) {
  const { token, userId } = await registerTestUser();
  await setAuthToken(page, token);
  return { token, userId };
}

// Re-export utilities
export { clearTestData, setAuthToken, clearAuthToken, registerTestUser };

// Common test configuration
export const FRONTEND_URL = 'http://localhost:3101';
export const BACKEND_URL = 'http://localhost:3100';