/**
 * Test Database Helper
 * 
 * Provides utilities for resetting the test database before each e2e test.
 * This prevents database conflicts and ensures clean test state.
 * 
 * Usage in e2e tests:
 *   import { clearTestData } from './test-db-helpers';
 *   
 *   test.beforeEach(async () => {
 *     await clearTestData();
 *   });
 */

const BACKEND_URL = 'http://localhost:3100';

/**
 * Clear all test data by calling the export/clear endpoint.
 * This deletes all profiles, sessions, messages, and settings.
 */
export async function clearTestData(): Promise<void> {
  // First, try to get a token for authenticated cleanup
  // If no token, the clear endpoint may still work for full reset
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/export/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth if available (for selective clearing)
        // 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      console.warn(`Database clear failed: ${response.status}`);
    }
  } catch (error) {
    console.warn('Database clear error:', error);
  }
}

/**
 * Register a test user and return token + userId.
 * Uses unique timestamp to prevent conflicts.
 */
export async function registerTestUser(
  username?: string, 
  password: string = 'TestPassword123!'
): Promise<{ token: string; userId: string }> {
  const uniqueUsername = username || `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: uniqueUsername, 
      password 
    }),
  });

  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`);
  }

  const data = await response.json();
  return { token: data.token, userId: data.user.id };
}

/**
 * Login a test user and return token + userId.
 */
export async function loginTestUser(
  username: string, 
  password: string = 'TestPassword123!'
): Promise<{ token: string; userId: string }> {
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  return { token: data.token, userId: data.user.id };
}

/**
 * Set auth token in page localStorage.
 */
export async function setAuthToken(page: any, token: string): Promise<void> {
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);
}

/**
 * Clear auth token from page localStorage.
 */
export async function clearAuthToken(page: any): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-auth-token');
  });
}

/**
 * Get fresh test user with auth token ready for use.
 * Combines registration and token setup in one call.
 */
export async function createAuthenticatedPage(page: any): Promise<{ token: string; userId: string }> {
  await clearTestData();
  
  const { token, userId } = await registerTestUser();
  await setAuthToken(page, token);
  
  return { token, userId };
}