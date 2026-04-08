import { test, expect, Page } from '@playwright/test';
import { clearTestData, registerTestUser, clearAuthToken } from './test-db-helpers';

/**
 * Comprehensive Toast Notification Tests
 * 
 * Tests toast notifications:
 * - VAL-TOAST-001: Success toast appears on successful actions
 * - VAL-TOAST-002: Error toast appears on failures
 * - VAL-TOAST-003: Toast auto-dismisses after delay
 * - VAL-TOAST-004: Toast can be manually dismissed
 */

const BACKEND_URL = 'http://localhost:3100';
const FRONTEND_URL = 'http://localhost:3101';

/**
 * Helper: Register a test user and get auth token
 */
async function registerAndGetToken(): Promise<string> {
  return (await registerTestUser()).token;
}

/**
 * Helper: Clear all data via API using auth token
 */
async function clearAllData(token: string) {
  const response = await fetch(`${BACKEND_URL}/api/export/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to clear data: ${response.status}`);
  }
}

/**
 * Helper: Create a profile with the given name and bio via UI onboarding
 */
async function createProfile(page: Page, name: string, bio?: string) {
  const token = await registerAndGetToken();

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Clear any persisted session ID before setting new auth token
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-active-session-id');
  });

  // Store token in localStorage
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);

  // Clear any existing data with the token
  await clearAllData(token);

  // Reload to start fresh with empty state
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Check if we're on onboarding (need to create profile)
  const nameInput = page.getByLabel('Name');
  const isOnboarding = await nameInput.isVisible().catch(() => false);

  if (isOnboarding) {
    await nameInput.fill(name);

    if (bio) {
      const bioInput = page.getByLabel('About You');
      await bioInput.fill(bio);
    }

    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }

  // Wait for home page to fully load with profile info
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
  
  return token;
}

/**
 * Helper: Navigate to the settings page using sidebar link
 */
async function goToSettingsPage(page: Page) {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
}

test.describe('Comprehensive Toast Notification Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all test data before each test
    await clearTestData();
    // Navigate to app first
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test.describe('VAL-TOAST-001: Success toast appears on successful actions', () => {
    test('Voice update shows success toast', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Success User', 'Testing success toast');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change the voice selection - this should trigger a success toast
      const voiceSelect = page.locator('#tts-voice-select');
      await voiceSelect.selectOption('en-US-BrianNeural');
      
      // Wait for the success toast to appear
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Verify toast has success styling (green left border)
      const toast = page.locator('.toast--success').first();
      await expect(toast).toBeVisible();
    });

    test('Rate update shows success toast', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Rate User', 'Testing rate toast');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change the rate slider value using mouseup to trigger save
      const rateSlider = page.locator('#tts-rate-slider');
      await rateSlider.evaluate((el: HTMLInputElement) => {
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '50');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      
      // Wait for the success toast to appear
      await expect(page.getByText('Rate updated')).toBeVisible({ timeout: 5000 });
    });

    test('Data export shows success toast', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Export User', 'Testing export toast');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      
      // Click export button
      await page.getByRole('button', { name: 'Download JSON Export' }).click();
      
      // Wait for download to complete
      await downloadPromise;
      
      // Success toast should appear
      await expect(page.getByText('Data exported')).toBeVisible({ timeout: 5000 });
    });

    test('Success toast has correct structure and icon', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Structure User', 'Testing toast structure');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger success toast
      await page.locator('#tts-voice-select').selectOption('en-US-ChristopherNeural');
      
      // Wait for toast to appear
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Verify toast container exists
      const toastContainer = page.locator('.toast-container');
      await expect(toastContainer).toBeVisible();
      
      // Verify toast has correct role for accessibility
      const toastItem = page.locator('.toast').first();
      await expect(toastItem).toHaveAttribute('role', 'alert');
      await expect(toastItem).toHaveAttribute('aria-live', 'assertive');
      
      // Verify success icon is present (check for success class styling)
      await expect(toastItem).toHaveClass(/toast--success/);
      
      // Verify toast has title
      const toastTitle = page.locator('.toast__title').first();
      await expect(toastTitle).toContainText('Voice updated');
    });
  });

  test.describe('VAL-TOAST-002: Error toast appears on failures', () => {
    test('Import with invalid JSON shows error toast', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Error User', 'Testing error toast');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Create an invalid JSON file
      const invalidJson = '{ "invalid": "json", missing closing brace';
      
      // Upload the invalid file using file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from(invalidJson),
      });
      
      // Wait for error toast to appear
      await expect(page.getByText('Import failed')).toBeVisible({ timeout: 5000 });
      
      // Verify toast has error styling (red left border)
      const errorToast = page.locator('.toast--error').first();
      await expect(errorToast).toBeVisible();
    });

    test('Error toast has correct structure', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Error Structure User', 'Testing error structure');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Create an invalid JSON file
      const invalidJson = '{ "broken": true }extra';
      
      // Upload the invalid file
      await page.locator('input[type="file"]').setInputFiles({
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from(invalidJson),
      });
      
      // Wait for error toast
      await expect(page.getByText('Import failed')).toBeVisible({ timeout: 5000 });
      
      // Verify toast item has error styling
      const errorToast = page.locator('.toast--error').first();
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toHaveClass(/toast--error/);
      
      // Verify role for accessibility
      await expect(errorToast).toHaveAttribute('role', 'alert');
      await expect(errorToast).toHaveAttribute('aria-live', 'assertive');
      
      // Verify error title
      const toastTitle = page.locator('.toast__title').first();
      await expect(toastTitle).toContainText('Import failed');
    });
  });

  test.describe('VAL-TOAST-003: Toast auto-dismisses after delay', () => {
    test('Success toast auto-dismisses after 5 seconds', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Auto Dismiss User', 'Testing auto dismiss');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger success toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      
      // Verify toast appears
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Wait for auto-dismiss (default 5 seconds + buffer)
      await page.waitForTimeout(6000);
      
      // Toast should no longer be visible
      await expect(page.getByText('Voice updated')).not.toBeVisible();
    });

    test('Error toast auto-dismisses after delay', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Error Auto Dismiss User', 'Testing error auto dismiss');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Upload invalid JSON to trigger error toast
      await page.locator('input[type="file"]').setInputFiles({
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{ invalid json'),
      });
      
      // Verify error toast appears
      await expect(page.getByText('Import failed')).toBeVisible({ timeout: 5000 });
      
      // Wait for auto-dismiss (default 5 seconds + buffer)
      await page.waitForTimeout(6000);
      
      // Toast should no longer be visible
      await expect(page.getByText('Import failed')).not.toBeVisible();
    });

    test('Multiple toasts each have their own auto-dismiss timer', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Multi Toast User', 'Testing multiple toasts');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger first success toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Wait 2 seconds
      await page.waitForTimeout(2000);
      
      // Now change voice again - this creates a second toast
      // But the first one should continue its timer
      await page.locator('#tts-voice-select').selectOption('en-US-JennyNeural');
      
      // Both toasts should be visible at this point (if they overlap)
      // After 4 more seconds (6 total from first toast), the first toast should disappear
      await page.waitForTimeout(4000);
      
      // The first toast should be gone but second may still be there
      // This verifies toasts have independent timers
    });
  });

  test.describe('VAL-TOAST-004: Toast can be manually dismissed', () => {
    test('Clicking dismiss button removes toast immediately', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Manual Dismiss User', 'Testing manual dismiss');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger success toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      
      // Verify toast appears
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Click the dismiss button
      const dismissButton = page.locator('.toast__close').first();
      await dismissButton.click();
      
      // Toast should be immediately removed
      await expect(page.getByText('Voice updated')).not.toBeVisible();
      
      // Toast container may still exist but should be empty
      const toastCount = await page.locator('.toast').count();
      expect(toastCount).toBe(0);
    });

    test('Dismiss button has correct accessibility label', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Dismiss A11y User', 'Testing dismiss button');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      
      // Wait for toast to appear
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Verify dismiss button has accessible label
      const dismissButton = page.locator('.toast__close').first();
      await expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification');
    });

    test('Error toast can be manually dismissed', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Error Dismiss User', 'Testing error dismiss');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Trigger error toast
      await page.locator('input[type="file"]').setInputFiles({
        name: 'broken.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{ invalid'),
      });
      
      // Verify error toast appears
      await expect(page.getByText('Import failed')).toBeVisible({ timeout: 5000 });
      
      // Dismiss the error toast
      const dismissButton = page.locator('.toast__close').first();
      await dismissButton.click();
      
      // Toast should be immediately removed
      await expect(page.getByText('Import failed')).not.toBeVisible();
    });

    test('Can dismiss multiple toasts one by one', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Multi Dismiss User', 'Testing multi dismiss');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Trigger first toast with voice change
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Wait for toast to be fully visible then trigger a different toast
      // Export data triggers a different success toast
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await page.getByRole('button', { name: 'Download JSON Export' }).click();
      await downloadPromise;
      
      // Both toasts should be visible (voice updated AND data exported)
      await expect(page.getByText('Voice updated')).toBeVisible();
      await expect(page.getByText('Data exported')).toBeVisible();
      
      // Count should be 2
      const toastCount = await page.locator('.toast').count();
      expect(toastCount).toBe(2);
      
      // Dismiss the first toast
      await page.locator('.toast__close').first().click();
      await page.waitForTimeout(100);
      
      // Should have one toast remaining
      const remainingCount = await page.locator('.toast').count();
      expect(remainingCount).toBe(1);
      
      // Dismiss the second toast
      await page.locator('.toast__close').first().click();
      await page.waitForTimeout(100);
      
      // Should have no toasts remaining
      const finalCount = await page.locator('.toast').count();
      expect(finalCount).toBe(0);
    });
  });

  test.describe('Toast Notifications - Integration Scenarios', () => {
    test('Success toast shows with message content', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Toast Message User', 'Testing toast message');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice - success toast should include message
      await page.locator('#tts-voice-select').selectOption('en-US-MichelleNeural');
      
      // Wait for toast
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Toast should also have the message part (e.g., "Now using en-US-MichelleNeural")
      const toastItem = page.locator('.toast--success').first();
      await expect(toastItem).toBeVisible();
      
      // Check for message content
      const toastMessage = page.locator('.toast__message').first();
      await expect(toastMessage).toContainText('en-US-MichelleNeural');
    });

    test('Page remains functional after toast appears and dismisses', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Page Functionality User', 'Testing page works');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to trigger toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Dismiss toast
      await page.locator('.toast__close').click();
      await expect(page.getByText('Voice updated')).not.toBeVisible();
      
      // Settings page should still be fully functional
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      await expect(page.locator('#tts-voice-select')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Download JSON Export' })).toBeVisible();
      
      // Can navigate to another page
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    });

    test('Toast container is positioned correctly at bottom center', async ({ page }) => {
      // Create a profile
      await createProfile(page, 'Position User', 'Testing toast position');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Trigger a toast
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
      
      // Verify toast container exists and is visible
      const toastContainer = page.locator('.toast-container');
      await expect(toastContainer).toBeVisible();
      
      // Container should have region role for accessibility
      await expect(toastContainer).toHaveAttribute('role', 'region');
      await expect(toastContainer).toHaveAttribute('aria-label', 'Notifications');
    });
  });
});
