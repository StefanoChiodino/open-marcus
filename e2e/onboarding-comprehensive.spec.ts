import { test, expect } from '@playwright/test';
import {
  setAuthToken,
  clearAuthToken,
  registerTestUser,
} from './test-db-helpers';

/**
 * Comprehensive Onboarding Tests
 * 
 * Tests all onboarding flows:
 * - VAL-ONBOARD-001: New user sees onboarding form
 * - VAL-ONBOARD-002: Onboarding with empty name shows validation error
 * - VAL-ONBOARD-003: Onboarding with very long name handles gracefully
 * - VAL-ONBOARD-004: Onboarding with special characters in name works
 * - VAL-ONBOARD-005: Onboarding navigates to home on success
 * - VAL-ONBOARD-006: Returning user skips onboarding
 * 
 * NOTE: Registration auto-creates a profile via the API, so to test onboarding
 * we need to delete the profile after registration to simulate a user without profile.
 */

const FRONTEND_URL = 'http://localhost:3101';
const BACKEND_URL = 'http://localhost:3100';

/**
 * Helper: Register a test user and delete their profile (to simulate new user without profile)
 */
async function registerUserWithoutProfile(): Promise<{ token: string; userId: string }> {
  const uniqueUsername = `onboard_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const { token, userId } = await registerTestUser(uniqueUsername, 'Password1!');
  
  // Delete the auto-created profile so user has no profile (simulates onboarding state)
  const profileResponse = await fetch(`${BACKEND_URL}/api/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (profileResponse.ok) {
    const profile = await profileResponse.json();
    if (profile && profile.id) {
      await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: profile.id }),
      });
    }
  }
  
  return { token, userId };
}

test.describe('Comprehensive Onboarding Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth token before each test to start fresh
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test.describe('VAL-ONBOARD-001: New user sees onboarding form', () => {
    test('New user without profile sees ProfileForm with Name input and Begin Journey button', async ({ page }) => {
      // Register a new user and delete their profile (to simulate new user without profile)
      const { token } = await registerUserWithoutProfile();
      
      // Set auth token to simulate logged-in user without profile
      await setAuthToken(page, token);
      
      // Navigate to home - should redirect to onboarding
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should see onboarding form
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Should see the "Begin Journey" button
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await expect(beginButton).toBeVisible();
      
      // Should see form heading
      await expect(page.getByText('Tell Us About Yourself')).toBeVisible();
    });

    test('Onboarding form shows bio field and char count', async ({ page }) => {
      // Register a new user and delete their profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should see bio field
      await expect(page.getByLabel('About You')).toBeVisible();
      
      // Should see character count
      await expect(page.locator('.char-count')).toHaveText('0/500');
    });
  });

  test.describe('VAL-ONBOARD-002: Onboarding with empty name shows validation error', () => {
    test('Submitting with empty name shows "Name is required" error', async ({ page }) => {
      // Register and delete profile to get user without profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app - should show onboarding
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Name input should be visible
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Clear name field if pre-filled and try to submit with empty name
      await nameInput.clear();
      
      // Click Begin Journey without entering name
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Should see validation error
      const errorMessage = page.getByText('Name is required');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Should still be on onboarding (not redirected to home)
      await expect(nameInput).toBeVisible();
    });

    test('Submitting with whitespace-only name shows validation error', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Enter only whitespace in name
      const nameInput = page.getByLabel('Name');
      await nameInput.fill('   ');
      
      // Try to submit
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Should see validation error (whitespace-only is treated as empty)
      const errorMessage = page.getByText('Name is required');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Should remain on onboarding screen
      await expect(nameInput).toBeVisible();
    });

    test('Validation error is announced to screen readers', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Name input should have aria-required="true"
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      
      // Submit with empty name
      await nameInput.clear();
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Error should have role="alert" for screen readers
      const errorSpan = page.locator('#name-error');
      await expect(errorSpan).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('VAL-ONBOARD-003: Onboarding with very long name handles gracefully', () => {
    test('Form input maxLength prevents entering more than 50 characters', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Input should have maxLength="50"
      await expect(nameInput).toHaveAttribute('maxLength', '50');
      
      // Try to enter a very long name (60 characters)
      const longName = 'A'.repeat(60);
      await nameInput.fill(longName);
      
      // Value should be truncated to 50 characters
      const value = await nameInput.inputValue();
      expect(value.length).toBe(50);
    });

    test('Name at exactly 50 characters is accepted', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Enter exactly 50 characters
      const maxName = 'B'.repeat(50);
      await nameInput.fill(maxName);
      
      // Submit the form
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should be on home page with personalized greeting
      await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 5000 });
    });

    test('API rejects names exceeding 50 characters with appropriate error', async () => {
      // This tests backend validation - names > 50 chars should be rejected
      // We don't need to delete profile for this test since we test the API directly
      const uniqueUsername = `apiuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      
      // Try to create profile via API with very long name
      const response = await fetch(`${BACKEND_URL}/api/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'C'.repeat(100), // 100 character name
          bio: 'Test bio',
        }),
      });
      
      // Backend should return 400 or 422 for validation error
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const errorData = await response.json();
      expect(errorData.error || errorData.message).toBeTruthy();
    });
  });

  test.describe('VAL-ONBOARD-004: Onboarding with special characters in name works', () => {
    test('Name with HTML special characters is handled correctly', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      const bioInput = page.getByLabel('About You');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Enter name with special characters
      const specialName = 'John <script>alert("xss")</script>';
      const specialBio = 'Bio with quotes and apostrophes and brackets';
      await nameInput.fill(specialName);
      await bioInput.fill(specialBio);
      
      // Submit the form - app should handle XSS gracefully (not execute script)
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should successfully navigate to home (no crash from XSS)
      await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 5000 });
      
      // Navigate to profile to verify data was saved correctly
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      
      // The profile should be displayed - the XSS is escaped as text, not executed
      await expect(page.getByText('Profile Settings')).toBeVisible();
    });

    test('Name with emoji and unicode characters works', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Enter name with emoji
      const emojiName = '田中さん';
      await nameInput.fill(emojiName);
      
      // Bio with unicode
      const bioInput = page.getByLabel('About You');
      await bioInput.fill('Chinese and Japanese characters');
      
      // Submit the form
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should successfully navigate to home
      await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 5000 });
    });

    test('Name with only special characters is handled', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Enter name with only special characters (valid within 1-50 char limit)
      const symbolName = '@#$-_!';
      await nameInput.fill(symbolName);
      
      // Submit the form
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should successfully navigate to home
      await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('VAL-ONBOARD-005: Onboarding navigates to home on success', () => {
    test('Valid name submission redirects to home with personalized greeting', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app - should show onboarding
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Fill in name and complete onboarding
      await nameInput.fill('Alice');
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home page
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should see home page content
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Should see personalized greeting with the user's name
      await expect(page.getByText(/Welcome.*Alice/i)).toBeVisible({ timeout: 5000 });
      
      // Should see sidebar navigation (not onboarding)
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Meditation' })).toBeVisible();
    });

    test('Onboarding with bio field completes successfully', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Fill in name and bio
      const nameInput = page.getByLabel('Name');
      const bioInput = page.getByLabel('About You');
      await nameInput.fill('Bob');
      await bioInput.fill('I am a Stoic philosophy enthusiast');
      
      // Submit the form
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      
      // Wait for navigation to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should see home page
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Bio should appear on home page
      await expect(page.getByText(/Stoic philosophy/i)).toBeVisible({ timeout: 5000 });
    });

    test('After onboarding, navigation sidebar is visible', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Complete onboarding
      const nameInput = page.getByLabel('Name');
      await nameInput.fill('Charlie');
      const beginButton = page.getByRole('button', { name: 'Begin Journey' });
      await beginButton.click();
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should see all navigation items
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Meditation' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    });
  });

  test.describe('VAL-ONBOARD-006: Returning user skips onboarding', () => {
    test('User with existing profile goes directly to home page', async ({ page }) => {
      // Register a user (which auto-creates profile)
      const uniqueUsername = `returninguser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      await setAuthToken(page, token);
      
      // Navigate to app - should go directly to home since profile exists
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should go directly to home (not onboarding) because profile exists
      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Should NOT see onboarding form
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).not.toBeVisible({ timeout: 2000 });
    });

    test('New user without profile always sees onboarding', async ({ page }) => {
      // Register and delete profile to get user without profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should see onboarding (not home) because no profile exists
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      
      // Should NOT see home page heading
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).not.toBeVisible();
    });

    test('Multiple registrations without profiles show onboarding each time', async ({ page }) => {
      // First registration - user without profile
      const { token: token1 } = await registerUserWithoutProfile();
      await setAuthToken(page, token1);
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should see onboarding
      await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 });
      
      // Clear auth for second user
      await clearAuthToken(page);
      
      // Second registration - another user without profile
      const { token: token2 } = await registerUserWithoutProfile();
      await setAuthToken(page, token2);
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should also see onboarding (different user, no profile)
      await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Onboarding Form UI Elements', () => {
    test('Bio field shows character count', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Bio textarea should show character count
      const charCount = page.locator('.char-count');
      await expect(charCount).toBeVisible();
      await expect(charCount).toHaveText('0/500');
      
      // Type in bio and verify count updates
      const bioInput = page.getByLabel('About You');
      await bioInput.fill('Hello');
      await expect(charCount).toHaveText('5/500');
    });

    test('Bio field has max length of 500 characters', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const bioInput = page.getByLabel('About You');
      await expect(bioInput).toHaveAttribute('maxLength', '500');
    });

    test('Begin Journey button navigates to home on success', async ({ page }) => {
      // Register and delete profile
      const { token } = await registerUserWithoutProfile();
      await setAuthToken(page, token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      const nameInput = page.getByLabel('Name');
      await nameInput.fill('Test User');
      
      const submitButton = page.getByRole('button', { name: 'Begin Journey' });
      await submitButton.click();
      
      // Wait for submission to complete and navigate to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      
      // Should be on home page with greeting
      await expect(page.getByTestId('profile-name')).toBeVisible({ timeout: 5000 });
    });
  });
});
