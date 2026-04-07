import { test, expect } from '@playwright/test';

/**
 * Registration Screen Smoke Tests
 * 
 * Tests the registration screen:
 * - Registration page renders with username and password fields
 * - Password guidance checkmarks visible and update as user types
 * - Successful registration with weak password still succeeds
 * 
 * Fulfills: VAL-FRONTEND-002, VAL-PWD-GUIDE-001, VAL-PWD-GUIDE-002, VAL-PWD-GUIDE-003
 */

/**
 * Helper: Clear auth token from localStorage
 */
async function clearAuthToken(page: any) {
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-auth-token');
  });
}

test.describe('Registration Screen Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first, then clear auth token
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Clear auth token before each test to start fresh
    await clearAuthToken(page);
    // Navigate to register page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test('VAL-FRONTEND-002: Register page renders with username and password fields', async ({ page }) => {
    // Should see "Create Account" heading
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 10000 });
    
    // Should see username field
    const usernameInput = page.getByLabel('Username');
    await expect(usernameInput).toBeVisible();
    
    // Should see password field
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
    
    // Should see submit button
    const submitButton = page.getByRole('button', { name: 'Create Account' });
    await expect(submitButton).toBeVisible();
    
    // Should see link to login
    const loginLink = page.getByRole('link', { name: 'Sign in' });
    await expect(loginLink).toBeVisible();
    
    // Should see OpenMarcus branding
    await expect(page.getByRole('heading', { name: 'OpenMarcus' })).toBeVisible();
    await expect(page.getByText('Your Stoic Mental Health Companion')).toBeVisible();
  });

  test('VAL-PWD-GUIDE-001: Password guidance checkmarks visible', async ({ page }) => {
    // Fill password to trigger guidance display
    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill('test');
    
    // Should see password guidance section
    const guidance = page.locator('.password-guidance');
    await expect(guidance).toBeVisible({ timeout: 5000 });
    
    // Should see 5 checkmark criteria
    await expect(page.getByText('8+ characters')).toBeVisible();
    await expect(page.getByText('Uppercase letter')).toBeVisible();
    await expect(page.getByText('Lowercase letter')).toBeVisible();
    await expect(page.getByText('Number')).toBeVisible();
    await expect(page.getByText('Special character')).toBeVisible();
  });

  test('VAL-PWD-GUIDE-002: Checkmarks update as user types', async ({ page }) => {
    const passwordInput = page.getByLabel('Password');
    
    // Initially no guidance shown (empty password)
    await expect(page.locator('.password-guidance')).not.toBeVisible();
    
    // Type a short password - should show guidance but not all met
    await passwordInput.fill('short');
    await expect(page.locator('.password-guidance')).toBeVisible();
    
    // Only minLength should be met for "short" (5 chars < 8)
    const minLengthItem = page.locator('.password-guidance__item').filter({ hasText: '8+ characters' });
    await expect(minLengthItem).not.toHaveClass(/met/);
    
    // Clear and type password meeting minimum length
    await passwordInput.fill('longerpass');
    const minLengthItemNow = page.locator('.password-guidance__item').filter({ hasText: '8+ characters' });
    await expect(minLengthItemNow).toHaveClass(/met/);
    
    // Still not all met - add uppercase
    await passwordInput.fill('Longerpass');
    
    // Add number
    await passwordInput.fill('Longerpass1');
    
    // Add special char - all met
    await passwordInput.fill('Longerpass1!');
    await expect(page.getByText('All criteria met!')).toBeVisible();
  });

  test('VAL-PWD-GUIDE-003: Registration succeeds with weak password (advisory only)', async ({ page }) => {
    // Generate unique username
    const uniqueUsername = `testuser_${Date.now()}`;
    
    // Fill registration form with weak password
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    
    await usernameInput.fill(uniqueUsername);
    await passwordInput.fill('weak'); // Weak password - should still submit
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Create Account' });
    await submitButton.click();
    
    // Should NOT see error message (registration succeeded despite weak password)
    // The app redirects to home which shows profile creation for new users
    await expect(page.getByRole('heading', { name: 'Create Account' })).not.toBeVisible({ timeout: 5000 });
  });

  test('Registration with strong password succeeds', async ({ page }) => {
    // Generate unique username
    const uniqueUsername = `testuser_${Date.now()}`;
    
    // Fill registration form with strong password
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    
    await usernameInput.fill(uniqueUsername);
    await passwordInput.fill('Password1!'); // Strong password
    
    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Create Account' });
    await submitButton.click();
    
    // Should NOT see registration page anymore (navigation occurred)
    await expect(page.getByRole('heading', { name: 'Create Account' })).not.toBeVisible({ timeout: 5000 });
  });

  test('Link to login page works', async ({ page }) => {
    // Click on "Sign in" link
    const loginLink = page.getByRole('link', { name: 'Sign in' });
    await loginLink.click();
    
    // Should navigate to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // Should see login page content
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
  });

  test('Duplicate username shows error', async ({ page }) => {
    // Generate unique username
    const uniqueUsername = `testuser_${Date.now()}`;
    
    // Fill registration form
    const usernameInput = page.getByLabel('Username');
    const passwordInput = page.getByLabel('Password');
    
    await usernameInput.fill(uniqueUsername);
    await passwordInput.fill('Password1!');
    
    // Submit first time - should succeed (navigate away from register)
    const submitButton = page.getByRole('button', { name: 'Create Account' });
    await submitButton.click();
    
    // Wait for navigation away from register page
    await expect(page.getByRole('heading', { name: 'Create Account' })).not.toBeVisible({ timeout: 10000 });
    
    // Clear auth and try to register again with same username
    await clearAuthToken(page);
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Fill with same username
    await usernameInput.fill(uniqueUsername);
    await passwordInput.fill('DifferentPassword1!');
    
    // Submit - should fail with error
    await submitButton.click();
    
    // Should see error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
  });
});
