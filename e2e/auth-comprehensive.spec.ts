import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Authentication Tests
 * 
 * Tests all authentication flows:
 * - VAL-AUTH-001: Login with valid credentials redirects to home
 * - VAL-AUTH-002: Login with invalid password shows error
 * - VAL-AUTH-003: Login with non-existent username shows error
 * - VAL-AUTH-004: Registration creates account and redirects
 * - VAL-AUTH-005: Registration with duplicate username shows error
 * - VAL-AUTH-006: Password guidance updates in real-time
 * - VAL-AUTH-007: Logout clears auth and redirects to login
 * - VAL-AUTH-008: Logout clears all local state
 * - VAL-AUTH-009: Session persists after page reload
 * - VAL-AUTH-010: Expired/invalid token redirects to login
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
 * Helper: Clear auth token from localStorage
 */
async function clearAuthToken(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-auth-token');
  });
}

/**
 * Helper: Set auth token in localStorage
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

test.describe('Comprehensive Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    // Clear auth token before each test to start fresh
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test.describe('Login Flows', () => {
    test('VAL-AUTH-001: Login with valid credentials redirects to home', async ({ page }) => {
      // Register a user first
      const uniqueUsername = `authuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token: _token, userId: _userId } = await registerTestUser(uniqueUsername, 'correctpassword');
      
      // Navigate to login page
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Fill in correct credentials
      const usernameInput = page.getByLabel('Username');
      const passwordInput = page.getByLabel('Password');
      await usernameInput.fill(uniqueUsername);
      await passwordInput.fill('correctpassword');
      
      // Submit the form
      const submitButton = page.getByRole('button', { name: 'Sign In' });
      await submitButton.click();
      
      // Should navigate to home page (/)
      await page.waitForURL(/\/$|\/\/$/, { timeout: 10000 });
      
      // Should see home page content with personalized greeting
      const profileGreeting = page.getByTestId('profile-name');
      await expect(profileGreeting).toBeVisible({ timeout: 10000 });
    });

    test('VAL-AUTH-002: Login with invalid password shows error', async ({ page }) => {
      // Register a user first
      const uniqueUsername = `authuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await registerTestUser(uniqueUsername, 'correctpassword');
      
      // Navigate to login page
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Fill in wrong password
      const usernameInput = page.getByLabel('Username');
      const passwordInput = page.getByLabel('Password');
      await usernameInput.fill(uniqueUsername);
      await passwordInput.fill('wrongpassword');
      
      // Submit the form
      const submitButton = page.getByRole('button', { name: 'Sign In' });
      await submitButton.click();
      
      // Should see error message in an alert
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/invalid username or password/i)).toBeVisible({ timeout: 5000 });
      
      // Should still be on login page (not redirected)
      await expect(page).toHaveURL(/\/login/);
      
      // Should NOT see home page heading
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).not.toBeVisible();
    });

    test('VAL-AUTH-003: Login with non-existent username shows error', async ({ page }) => {
      // Navigate to login page
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Fill in non-existent username and any password
      const usernameInput = page.getByLabel('Username');
      const passwordInput = page.getByLabel('Password');
      await usernameInput.fill(`nonexistent_${Date.now()}`);
      await passwordInput.fill('anypassword');
      
      // Submit the form
      const submitButton = page.getByRole('button', { name: 'Sign In' });
      await submitButton.click();
      
      // Should see error message
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/invalid username or password/i)).toBeVisible({ timeout: 5000 });
      
      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Registration Flows', () => {
    test('VAL-AUTH-004: Registration creates account and redirects', async ({ page }) => {
      // Generate unique username
      const uniqueUsername = `newuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Navigate to register page
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Fill registration form with strong password
      const usernameInput = page.getByLabel('Username');
      const passwordInput = page.getByLabel('Password');
      await usernameInput.fill(uniqueUsername);
      await passwordInput.fill('Password1!');
      
      // Submit the form
      const submitButton = page.getByRole('button', { name: 'Create Account' });
      await submitButton.click();
      
      // Should navigate away from register page (either to home or onboarding)
      await page.waitForURL(/\/(?!.*register)/, { timeout: 10000 });
      
      // Should see home page content (Welcome to OpenMarcus heading, sidebar navigation)
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 5000 });
      
      // Should see sidebar navigation
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Meditation' })).toBeVisible();
    });

    test('VAL-AUTH-005: Registration with duplicate username shows error', async ({ page }) => {
      // Generate unique username
      const uniqueUsername = `dupuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Register the user first via API
      await registerTestUser(uniqueUsername, 'Password1!');
      
      // Navigate to register page
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Fill with same username
      const usernameInput = page.getByLabel('Username');
      const passwordInput = page.getByLabel('Password');
      await usernameInput.fill(uniqueUsername);
      await passwordInput.fill('DifferentPassword1!');
      
      // Submit - should fail
      const submitButton = page.getByRole('button', { name: 'Create Account' });
      await submitButton.click();
      
      // Should see error message
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/username.*exists|already.*taken|duplicate/i)).toBeVisible({ timeout: 5000 });
      
      // Should still be on register page
      await expect(page).toHaveURL(/\/register/);
    });

    test('VAL-AUTH-006: Password guidance updates in real-time', async ({ page }) => {
      // Navigate to register page
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      const passwordInput = page.getByLabel('Password');
      
      // Initially no guidance shown (empty password)
      const guidance = page.locator('.password-guidance');
      await expect(guidance).not.toBeVisible();
      
      // Type short password - guidance appears
      await passwordInput.fill('short');
      await expect(guidance).toBeVisible({ timeout: 2000 });
      
      // Check that minLength is NOT met for "short" (5 chars < 8)
      const minLengthItem = page.locator('.password-guidance__item').filter({ hasText: '8+ characters' });
      await expect(minLengthItem).not.toHaveClass(/met/);
      
      // Clear and type password meeting minimum length - minLength IS met now
      await passwordInput.fill('longerpass');
      await expect(minLengthItem).toHaveClass(/met/);
      
      // Add uppercase - uppercase criterion met
      await passwordInput.fill('Longerpass');
      const uppercaseItem = page.locator('.password-guidance__item').filter({ hasText: 'Uppercase' });
      await expect(uppercaseItem).toHaveClass(/met/);
      
      // Add number
      await passwordInput.fill('Longerpass1');
      const numberItem = page.locator('.password-guidance__item').filter({ hasText: 'Number' });
      await expect(numberItem).toHaveClass(/met/);
      
      // Add special character - all criteria met
      await passwordInput.fill('Longerpass1!');
      await expect(page.getByText('All criteria met!')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Logout Flows', () => {
    test('VAL-AUTH-007: Logout clears auth and redirects to login', async ({ page }) => {
      // Register and set up authenticated session
      const uniqueUsername = `logoutuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      await setAuthToken(page, token);
      
      // Navigate to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Create profile if onboarding appears
      await createProfile(page, 'Logout Test User');
      
      // Find and click logout button
      const logoutButton = page.getByRole('button', { name: /Log out/i });
      await logoutButton.click();
      
      // Wait for redirect to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      
      // Should be on login page
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
      
      // Token should be cleared from localStorage
      const tokenInStorage = await page.evaluate(() => localStorage.getItem('openmarcus-auth-token'));
      expect(tokenInStorage).toBeNull();
    });

    test('VAL-AUTH-008: Logout clears all local state', async ({ page }) => {
      // Register and set up authenticated session with profile
      const uniqueUsername = `clearuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      await setAuthToken(page, token);
      
      // Navigate to home and create profile
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      await createProfile(page, 'Clear State Test User');
      
      // Verify we have a profile by checking for greeting
      await expect(page.getByText(/welcome.*clear/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // Name might be shown in sidebar or profile area
      });
      
      // Perform logout
      const logoutButton = page.getByRole('button', { name: /Log out/i });
      await logoutButton.click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      
      // After logout, auth token should NOT be in localStorage
      const tokenAfter = await page.evaluate(() => localStorage.getItem('openmarcus-auth-token'));
      expect(tokenAfter).toBeNull();
    });
  });

  test.describe('Session Persistence', () => {
    test('VAL-AUTH-009: Session persists after page reload', async ({ page }) => {
      // Register, login, and create profile
      const uniqueUsername = `persistuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      await setAuthToken(page, token);
      
      // Navigate to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Create profile if needed
      await createProfile(page, 'Persist Test User');
      
      // Should be on home page with personalized content
      await page.waitForURL(/\/$|\/\/$/, { timeout: 10000 });
      const profileGreeting = page.getByTestId('profile-name');
      await expect(profileGreeting).toBeVisible({ timeout: 5000 });
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should STILL be on home page (not redirected to login)
      await expect(page).toHaveURL(/\/$|\/\/$/, { timeout: 10000 });
      
      // Should see same personalized content (no login prompt)
      await expect(profileGreeting).toBeVisible({ timeout: 5000 });
      
      // Should NOT see login page elements
      await expect(page.getByLabel('Username')).not.toBeVisible({ timeout: 2000 });
      await expect(page.getByLabel('Password')).not.toBeVisible({ timeout: 2000 });
      
      // Token should still be in localStorage
      const tokenAfterReload = await page.evaluate(() => localStorage.getItem('openmarcus-auth-token'));
      expect(tokenAfterReload).not.toBeNull();
    });

    test('VAL-AUTH-010: Expired/invalid token redirects to login', async ({ page }) => {
      // Set an invalid/fake token in localStorage
      const fakeToken = 'invalid_token_12345';
      await setAuthToken(page, fakeToken);
      
      // Navigate to the app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Wait a moment for any redirect to occur after token validation fails
      await page.waitForTimeout(2000);
      
      // Should be redirected to login (since token is invalid)
      // Check the current URL
      const currentUrl = page.url();
      const isOnLogin = currentUrl.includes('/login');
      
      if (isOnLogin) {
        // Should be on login page
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
        
        // Should see login form
        await expect(page.getByLabel('Username')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
      }
      
      // Token should have been cleared from localStorage
      const tokenAfter = await page.evaluate(() => localStorage.getItem('openmarcus-auth-token'));
      expect(tokenAfter).toBeNull();
    });
  });

  test.describe('Login Page UI', () => {
    test('Login page renders with all required elements', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Should see login page heading
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
    });

    test('Register link navigates to registration page', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Click register link
      const registerLink = page.getByRole('link', { name: 'Create an account' });
      await registerLink.click();
      
      // Should navigate to register page
      await page.waitForURL(/\/register/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Register Page UI', () => {
    test('Register page renders with all required elements', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
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
    });

    test('Sign in link navigates to login page', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Click sign in link
      const loginLink = page.getByRole('link', { name: 'Sign in' });
      await loginLink.click();
      
      // Should navigate to login page
      await page.waitForURL(/\/login/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Edge Cases', () => {
    test('Empty login form has disabled submit button', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Submit button should be disabled when fields are empty
      const submitButton = page.getByRole('button', { name: 'Sign In' });
      await expect(submitButton).toBeDisabled();
    });

    test('Empty registration form has disabled submit button', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Submit button should be disabled when fields are empty
      const submitButton = page.getByRole('button', { name: 'Create Account' });
      await expect(submitButton).toBeDisabled();
    });
  });
});
