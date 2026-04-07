import { test, expect } from '@playwright/test';
import { registerTestUser } from './test-db-helpers';

/**
 * Login Screen Smoke Tests
 * 
 * Tests the login screen:
 * - Login page renders with username and password fields
 * - Error message displayed on failed login
 * - Successful login redirects to home
 * 
 * Fulfills: VAL-FRONTEND-001, VAL-FRONTEND-005
 */

/**
 * Helper: Register a test user via API
 */
async function registerAndGetToken(username: string, password: string): Promise<{ token: string; userId: string }> {
  return registerTestUser(username, password);
}

/**
 * Helper: Clear auth token from localStorage
 */
async function clearAuthTokenHelper(page: any) {
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-auth-token');
  });
}

test.describe('Login Screen Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first, then clear auth token
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Clear auth token before each test to start fresh
    await clearAuthTokenHelper(page);
  });

  test('VAL-FRONTEND-001: Login page renders with username and password fields', async ({ page }) => {
    // Should be on login page (not redirected to home)
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 10000 });
    
    // Should see username field
    const usernameInput = page.getByLabel('Username');
    await expect(usernameInput).toBeVisible();
    
    // Should see password field
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
    
    // Should see submit button
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await expect(submitButton).toBeVisible();
    
    // Should see link to register
    const registerLink = page.getByRole('link', { name: 'Create an account' });
    await expect(registerLink).toBeVisible();
    
    // Should see OpenMarcus branding
    await expect(page.getByRole('heading', { name: 'OpenMarcus' })).toBeVisible();
    await expect(page.getByText('Your Stoic Mental Health Companion')).toBeVisible();
  });

  test('VAL-FRONTEND-005: Auth error messages displayed on failed login', async ({ page }) => {
    // Register a user first
    const { token: _token, userId: _userId } = await registerAndGetToken(`testuser_${Date.now()}`, 'correctpassword');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in wrong password
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    await usernameInput.fill(`testuser_${Date.now()}`);
    await passwordInput.fill('wrongpassword');
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await submitButton.click();
    
    // Should see error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('Login with wrong password shows error message', async ({ page }) => {
    // Register a user first
    const { token: _token, userId: _userId } = await registerAndGetToken(`testuser_${Date.now()}`, 'correctpassword');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in wrong password
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    await usernameInput.fill(`testuser_${Date.now()}`);
    await passwordInput.fill('wrongpassword');
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await submitButton.click();
    
    // Should see error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });

  test('Login with correct credentials redirects to home', async ({ page }) => {
    // Register a user first
    const { token: _token, userId: _userId } = await registerAndGetToken(`testuser_${Date.now()}`, 'correctpassword');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill in correct credentials
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    await usernameInput.fill(`testuser_${Date.now()}`);
    await passwordInput.fill('correctpassword');
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await submitButton.click();
    
    // Should navigate to home page
    await page.waitForURL('**/', { timeout: 10000 });
    
    // Should see home page content
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
  });
});
