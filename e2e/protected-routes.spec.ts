import { test, expect } from '@playwright/test';

/**
 * Protected Routes E2E Tests
 * 
 * Tests that route protection works correctly:
 * - Unauthenticated users accessing protected routes are redirected to /login
 * - Authenticated users accessing /login or /register are redirected to /
 * 
 * Fulfills: VAL-PROTECTED-001, VAL-PROTECTED-002, VAL-PROTECTED-003
 */

/**
 * Helper: Register a test user via API
 */
async function registerTestUser(username: string, password: string): Promise<{ token: string; userId: string }> {
  const registerResponse = await fetch('http://localhost:3100/api/auth/register', {
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
 * Helper: Clear auth token from localStorage
 */
async function clearAuthToken(page: any) {
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-auth-token');
  });
}

/**
 * Helper: Set auth token in localStorage
 */
async function setAuthToken(page: any, token: string) {
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);
}

/**
 * Helper: Create a profile via the UI
 */
async function createProfile(page: any, name: string) {
  // Fill the name input if visible (onboarding screen)
  const nameInput = page.getByLabel('Name');
  const isOnboarding = await nameInput.isVisible().catch(() => false);
  
  if (isOnboarding) {
    await nameInput.fill(name);
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Protected Routes E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Clear auth token before each test to start fresh
    await clearAuthToken(page);
  });

  test('VAL-PROTECTED-001: Unauthenticated user visiting /session redirects to /login', async ({ page }) => {
    // Try to visit the protected session page directly
    await page.goto('/session');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Should see login page content
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('VAL-PROTECTED-001: Unauthenticated user visiting /history redirects to /login', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECTED-001: Unauthenticated user visiting /profile redirects to /login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECTED-001: Unauthenticated user visiting /settings redirects to /login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECTED-002: Authenticated user visiting /login redirects to /', async ({ page }) => {
    // Register and login a user
    const { token } = await registerTestUser(`testuser_${Date.now()}`, 'testpassword123');
    
    // Set auth token
    await setAuthToken(page, token);
    
    // Navigate to /login while authenticated
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to home
    await expect(page).toHaveURL(/\/$|\/$/);
  });

  test('VAL-PROTECTED-002: Authenticated user visiting /register redirects to /', async ({ page }) => {
    // Register and login a user
    const { token } = await registerTestUser(`testuser_${Date.now()}`, 'testpassword123');
    
    // Set auth token
    await setAuthToken(page, token);
    
    // Navigate to /register while authenticated
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to home
    await expect(page).toHaveURL(/\/$|\/$/);
  });

  test('VAL-PROTECTED-003: Authenticated user can access protected route /session', async ({ page }) => {
    // Register and get token
    const { token } = await registerTestUser(`testuser_${Date.now()}`, 'testpassword123');
    
    // Set auth token and create profile
    await setAuthToken(page, token);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'TestUser');
    
    // Navigate to /session
    await page.goto('/session');
    await page.waitForLoadState('networkidle');
    
    // Should be on session page
    await expect(page).toHaveURL(/\/session/);
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECTED-003: Authenticated user can access protected route /history', async ({ page }) => {
    const { token } = await registerTestUser(`testuser_${Date.now()}`, 'testpassword123');
    
    await setAuthToken(page, token);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'TestUser');
    
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/history/);
    // Should see session history content (heading "Your Meditation History" or similar)
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 5000 });
  });

  test('VAL-PROTECTED-003: Authenticated user can access protected route /settings', async ({ page }) => {
    const { token } = await registerTestUser(`testuser_${Date.now()}`, 'testpassword123');
    
    await setAuthToken(page, token);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await createProfile(page, 'TestUser');
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 5000 });
  });
});
