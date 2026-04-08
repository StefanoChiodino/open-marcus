import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Protected Routes Tests
 * 
 * Tests route protection behavior:
 * - Unauthenticated access to protected routes redirects to /login
 * - Authenticated user visiting /login or /register redirects to home
 * 
 * Fulfills:
 * - VAL-PROTECT-001: /session redirects unauthenticated to /login
 * - VAL-PROTECT-002: /history redirects unauthenticated to /login
 * - VAL-PROTECT-003: /profile redirects unauthenticated to /login
 * - VAL-PROTECT-004: /settings redirects unauthenticated to /login
 * - VAL-PROTECT-005: Authenticated /login redirects to home
 * - VAL-PROTECT-006: Authenticated /register redirects to home
 */

const BACKEND_URL = 'http://localhost:3100';
const FRONTEND_URL = 'http://localhost:3101';

/**
 * Helper: Register a test user via API
 */
async function registerTestUser(username: string, password: string): Promise<{ token: string; userId: string }> {
  const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Failed to register: ${registerResponse.status}`);
  }

  const data = await registerResponse.json();
  return { token: data.token, userId: data.user.id };
}

/**
 * Helper: Clear auth token from localStorage (safe - works from any page)
 */
async function clearAuthToken(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.removeItem('openmarcus-auth-token');
    });
  } catch {
    // localStorage not accessible on this page (e.g., about:blank after redirect)
    // This is fine - it means auth was already cleared by the redirect
  }
}

/**
 * Helper: Set auth token in localStorage (must be called when page has a document)
 */
async function setAuthToken(page: Page, token: string) {
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);
}

/**
 * Helper: Create a profile via the UI (onboarding)
 */
async function createProfile(page: Page, name: string) {
  const nameInput = page.getByLabel('Name');
  const isOnboarding = await nameInput.isVisible().catch(() => false);
  
  if (isOnboarding) {
    await nameInput.fill(name);
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Protected Routes - Unauthenticated Access', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    // Clear auth token before each test to start fresh (unauthenticated)
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test('VAL-PROTECT-001: /session redirects unauthenticated to /login', async ({ page }) => {
    // Try to visit the protected session page directly
    await page.goto(`${FRONTEND_URL}/session`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Should see login page content
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('VAL-PROTECT-002: /history redirects unauthenticated to /login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/history`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECT-003: /profile redirects unauthenticated to /login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/profile`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECT-004: /settings redirects unauthenticated to /login', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Protected Routes - Authenticated User on Auth Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test - navigate first to allow localStorage access
    await page.goto(FRONTEND_URL).catch(() => {});
    await clearAuthToken(page);
  });

  test('VAL-PROTECT-005: Authenticated user visiting /login redirects to home', async ({ page }) => {
    // Register and login a user
    const uniqueUsername = `protuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    // Set auth token
    await setAuthToken(page, token);
    
    // Navigate to home first to establish session
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Create profile if onboarding appears
    await createProfile(page, 'Prot Test User');
    
    // Now navigate to /login while authenticated
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to home page (/)
    await expect(page).toHaveURL(/\/$|\/\?/);
  });

  test('VAL-PROTECT-006: Authenticated user visiting /register redirects to home', async ({ page }) => {
    // Register and login a user
    const uniqueUsername = `protuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    // Set auth token
    await setAuthToken(page, token);
    
    // Navigate to home first to establish session
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Create profile if onboarding appears
    await createProfile(page, 'Prot Test User');
    
    // Now navigate to /register while authenticated
    await page.goto(`${FRONTEND_URL}/register`);
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to home page (/)
    await expect(page).toHaveURL(/\/$|\/\?/);
  });
});

test.describe('Protected Routes - Authenticated Access to Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Navigate to app to allow localStorage access, then clear
    try {
      await page.goto(FRONTEND_URL, { timeout: 3000 }).catch(() => {});
      await clearAuthToken(page);
    } catch {
      // ignore
    }
  });

  test('Authenticated user can access /session', async ({ page }) => {
    // Register and get token
    const uniqueUsername = `protsession_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    // Navigate and set token
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await setAuthToken(page, token);
    
    // Create profile
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'Session Test User');
    
    // Navigate to /session
    await page.goto(`${FRONTEND_URL}/session`);
    await page.waitForLoadState('networkidle');
    
    // Should be on session page
    await expect(page).toHaveURL(/\/session/);
    // Should see session page content
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 5000 });
  });

  test('Authenticated user can access /history', async ({ page }) => {
    const uniqueUsername = `prothistory_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await setAuthToken(page, token);
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'History Test User');
    
    await page.goto(`${FRONTEND_URL}/history`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/history/);
    // Should see history heading
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 5000 });
  });

  test('Authenticated user can access /profile', async ({ page }) => {
    const uniqueUsername = `protprofile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await setAuthToken(page, token);
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'Profile Test User');
    
    await page.goto(`${FRONTEND_URL}/profile`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 5000 });
  });

  test('Authenticated user can access /settings', async ({ page }) => {
    const uniqueUsername = `protSettings_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { token } = await registerTestUser(uniqueUsername, 'Password1!');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await setAuthToken(page, token);
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'Settings Test User');
    
    await page.goto(`${FRONTEND_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Protected Routes - Redirect Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.goto(FRONTEND_URL, { timeout: 3000 }).catch(() => {});
      await clearAuthToken(page);
    } catch {
      // ignore
    }
  });

  test('Unauthenticated /session redirects to /login, not /', async ({ page }) => {
    // Clear any existing auth (already done in beforeEach, but being explicit)
    await clearAuthToken(page);
    
    await page.goto(`${FRONTEND_URL}/session`);
    await page.waitForLoadState('networkidle');
    
    // Must be on /login, not /
    await expect(page).toHaveURL(/\/login/);
    // Should NOT see home page content
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).not.toBeVisible({ timeout: 2000 });
  });

  test('Unauthenticated /settings redirects to /login, not home', async ({ page }) => {
    await clearAuthToken(page);
    
    await page.goto(`${FRONTEND_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    // Verify we're actually on login page
    await expect(page.getByLabel('Username')).toBeVisible({ timeout: 3000 });
  });
});
