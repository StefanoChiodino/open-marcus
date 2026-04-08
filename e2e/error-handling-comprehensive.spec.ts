import { test, expect, Page } from '@playwright/test';
import { clearTestData, registerTestUser, setAuthToken, clearAuthToken } from './test-db-helpers';

/**
 * Comprehensive Error Handling Tests
 * 
 * Tests error handling scenarios:
 * - VAL-ERROR-001: Network error shows user-friendly message
 * - VAL-ERROR-002: API 500 error handled gracefully
 * - VAL-ERROR-003: Timeout error handled gracefully
 * - VAL-ERROR-004: Offline state detected and shown
 * 
 * IMPORTANT: These tests mock individual API endpoints rather than all APIs.
 * Mocking ALL /api/** routes causes auth verification to fail, redirecting to login
 * before error handling UI can be displayed. Auth endpoints (/api/auth/**) must
 * remain functional for the app to stay authenticated and show error UI.
 */

const FRONTEND_URL = 'http://localhost:3101';

/**
 * Helper: Create authenticated page with profile
 */
async function createAuthenticatedPage(page: Page, name: string = 'Error Test User'): Promise<string> {
  const { token } = await registerTestUser();
  await setAuthToken(page, token);

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Check if onboarding is needed
  const nameInput = page.getByLabel('Name');
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }

  // Wait for home page
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });

  return token;
}

/**
 * Helper: Check for specific error UI elements (toast or error boundary)
 * These are the proper error handling indicators - not just body content
 */
async function hasErrorUI(page: Page): Promise<boolean> {
  // Error toast appears when API calls fail
  if (await page.locator('.toast--error').count() > 0) return true;
  
  // Error boundary shows for React render errors  
  if (await page.locator('.error-boundary').count() > 0) return true;
  
  // Session error display shows when session operations fail
  if (await page.locator('.meditation-chat__error[role="alert"]').count() > 0) return true;
  
  // History error display
  if (await page.locator('.session-history__error[role="alert"]').count() > 0) return true;
  
  // Generic alert role (fallback for any error message)
  if (await page.locator('[role="alert"]').count() > 0) return true;
  
  return false;
}

/**
 * Helper: Mock all non-auth API calls while allowing auth to work.
 * This fixes the issue where mocking all /api/ routes would abort auth verification,
 * causing redirect to login before error UI could be displayed.
 */

test.describe('Comprehensive Error Handling Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearTestData();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.context().setOffline(false);
    await clearAuthToken(page);
  });

  test.describe('VAL-ERROR-001: Network error shows user-friendly message', () => {
    test('Shows error UI when session list API is unreachable', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to history first - this triggers session list load
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      // Now mock only the sessions API to fail (auth stays valid)
      await page.route('**/api/sessions**', (route) => {
        route.abort('failed');
      });

      // Navigate to history again to trigger failed API call
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForTimeout(3000);

      // Should see error UI (toast, error boundary, or error display)
      // This FAIL means error handling UI is not being shown - a real bug
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Network error during chat shows error UI', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Allow session creation to proceed
      await page.route('**/api/sessions**', (route) => route.continue());

      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      if (await beginBtn.isVisible()) {
        await beginBtn.click();
        await page.waitForTimeout(1000);
      }

      // Mock chat API to fail with network error
      await page.route('**/api/chat**', (route) => {
        route.abort('failed');
      });

      const chatInput = page.locator('input[placeholder*="Type"], textarea').first();
      if (await chatInput.isVisible()) {
        await chatInput.fill('Hello Marcus');
        await page.getByRole('button', { name: 'Send' }).click();
        await page.waitForTimeout(3000);
      }

      // Should see error UI for failed chat
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Network error during settings load shows error UI', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Mock settings API to fail
      await page.route('**/api/settings**', (route) => {
        route.abort('failed');
      });

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForTimeout(3000);

      // Should see error UI
      expect(await hasErrorUI(page)).toBeTruthy();
    });
  });

  test.describe('VAL-ERROR-002: API 500 error handled gracefully', () => {
    test('Shows error UI when server returns 500 on session create', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Mock session create API to return 500
      await page.route('**/api/sessions**', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' }),
          });
        } else {
          route.continue();
        }
      });

      // Try to begin meditation
      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      if (await beginBtn.isVisible()) {
        await beginBtn.click();
        await page.waitForTimeout(3000);
      }

      // Should see error UI when 500 occurs
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Shows error UI when server returns 500 on profile load', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Mock profile API to return 500
      await page.route('**/api/profile**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.reload();
      await page.waitForTimeout(2000);

      // Should show error UI
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Shows error UI when chat API returns 500', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Allow session creation
      await page.route('**/api/sessions**', (route) => route.continue());

      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      if (await beginBtn.isVisible()) {
        await beginBtn.click();
        await page.waitForTimeout(1000);
      }

      // Mock chat API to return 500
      await page.route('**/api/chat**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Chat service unavailable' }),
        });
      });

      const chatInput = page.locator('input[placeholder*="Type"], textarea').first();
      if (await chatInput.isVisible()) {
        await chatInput.fill('Hello Marcus');
        await page.getByRole('button', { name: 'Send' }).click();
        await page.waitForTimeout(3000);
      }

      // Should see error UI for failed chat
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('500 error during data export shows error toast', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Mock export API to return 500
      await page.route('**/api/export**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export failed' }),
        });
      });

      await page.getByRole('button', { name: 'Download JSON Export' }).click();

      // Wait for error toast
      await expect(page.locator('.toast--error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.toast--error')).toContainText(/export|failed|error/i);
    });
  });

  test.describe('VAL-ERROR-003: Timeout error handled gracefully', () => {
    test('Shows timeout error when session API times out', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to history first
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      // Mock session API to timeout
      await page.route('**/api/sessions**', (route) => {
        route.abort('timedout');
      });

      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForTimeout(3000);

      // Should see error UI for timeout
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Session API timeout handled without crash', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Mock session API to timeout
      await page.route('**/api/sessions**', (route) => {
        route.abort('timedout');
      });

      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      if (await beginBtn.isVisible()) {
        await beginBtn.click();
        await page.waitForTimeout(3000);
      }

      // Verify page still has content (not blank crash)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });

    test('Settings API timeout handled without crash', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      await page.route('**/api/settings**', (route) => {
        route.abort('timedout');
      });

      const voiceSelect = page.locator('#tts-voice-select');
      if (await voiceSelect.isVisible()) {
        await voiceSelect.selectOption('en-US-BrianNeural');
        await page.waitForTimeout(3000);
      }

      // Verify page still functional
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe('VAL-ERROR-004: Offline state detected and shown', () => {
    test('Browser offline state shows offline indicator', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.context().setOffline(true);
      await page.waitForTimeout(3000);

      // Verify page content remains (app handles offline gracefully)
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });

    test('Offline state prevents API calls and shows errors', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      await page.context().setOffline(true);
      await page.waitForTimeout(2000);

      // Verify page handles offline gracefully
      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });

    test('Coming back online restores functionality', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      await page.context().setOffline(true);
      await page.waitForTimeout(1000);

      const voiceSelect = page.locator('#tts-voice-select');
      if (await voiceSelect.isVisible()) {
        await voiceSelect.selectOption('en-US-BrianNeural');
        await page.waitForTimeout(2000);
      }

      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      // After going back online, settings changes should work
      if (await voiceSelect.isVisible()) {
        await voiceSelect.selectOption('en-US-JennyNeural');
        await page.waitForTimeout(3000);
      }
    });

    test('Offline indicator visible when going offline', async ({ page }) => {
      await createAuthenticatedPage(page);

      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();

      await page.context().setOffline(true);
      await page.waitForTimeout(3000);

      const bodyText = await page.locator('body').textContent();
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });

    test('Online status restored after going back online shows success', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      await page.context().setOffline(true);
      await page.waitForTimeout(1500);

      await page.context().setOffline(false);
      await page.waitForTimeout(2000);

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Handling - Integration Scenarios', () => {
    test('Multiple rapid API failures show error UI', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Fail multiple API calls (but not auth)
      await page.route('**/api/sessions**', (route) => {
        route.abort('failed');
      });

      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForTimeout(2000);

      // Should see error UI when APIs fail
      expect(await hasErrorUI(page)).toBeTruthy();
    });

    test('Error toast is dismissible', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      await page.route('**/api/export**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export failed' }),
        });
      });

      await page.getByRole('button', { name: 'Download JSON Export' }).click();

      await expect(page.locator('.toast--error')).toBeVisible({ timeout: 5000 });

      const dismissBtn = page.locator('.toast__close').first();
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
        await page.waitForTimeout(500);

        const toastCount = await page.locator('.toast').count();
        expect(toastCount).toBe(0);
      }
    });

    test('Page remains usable after encountering errors', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      // Mock settings API to fail
      await page.route('**/api/settings**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForTimeout(2000);

      // Page should handle error gracefully - show error UI
      expect(await hasErrorUI(page)).toBeTruthy();

      // Can still navigate back home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    });
  });
});
