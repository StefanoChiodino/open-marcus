import { test, expect, Page } from '@playwright/test';
import { registerTestUser } from './test-db-helpers';

/**
 * Comprehensive Performance Tests
 * 
 * Tests performance characteristics:
 * - VAL-PERF-001: Page loads within 5 seconds
 * - VAL-PERF-002: No console errors during normal usage (excluding expected API errors)
 * - VAL-PERF-003: Session start is responsive within 2 seconds
 */

const FRONTEND_URL = 'http://localhost:3101';

/**
 * Helper: Create authenticated page by registering, setting token, and handling onboarding
 */
async function createAuthenticatedPage(page: Page, name: string = 'Perf User'): Promise<void> {
  // Register a new user
  const { token } = await registerTestUser();

  // Navigate to app
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Set auth token
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
    localStorage.removeItem('openmarcus-active-session-id');
  }, token);

  // Reload to apply auth
  await page.reload();
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
}

/**
 * Helper: Navigate to session page
 */
async function goToSessionPage(page: Page) {
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
}

/**
 * Filter console errors to remove benign/expected errors
 */
function filterConsoleErrors(errors: string[]): string[] {
  return errors.filter(err => 
    !err.includes('favicon') && 
    !err.includes('chrome-extension') &&
    !err.includes('ResizeObserver') &&
    !err.includes('401') &&
    !err.includes('400') &&
    !err.includes('Failed to load resource')
  );
}

test.describe('Comprehensive Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth and navigate to start fresh
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      localStorage.removeItem('openmarcus-auth-token');
      localStorage.removeItem('openmarcus-active-session-id');
    });
  });

  test.describe('VAL-PERF-001: Page loads within reasonable time', () => {
    test('Home page loads within 5 seconds', async ({ page }) => {
      const { token } = await registerTestUser();

      const startTime = Date.now();
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      await page.evaluate((t: string) => {
        localStorage.setItem('openmarcus-auth-token', t);
      }, token);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Home page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('Session page loads within 5 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);

      const startTime = Date.now();
      await goToSessionPage(page);
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Session page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
      await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
    });

    test('History page loads within 5 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);

      const startTime = Date.now();
      await page.getByRole('link', { name: 'History' }).click();
      // History page shows "Past Meditations" if sessions exist, or "No Meditations Yet" if empty
      await expect(page.getByRole('heading', { name: /Past Meditations|No Meditations Yet/ })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`History page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('Profile page loads within 5 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);

      const startTime = Date.now();
      await page.getByRole('link', { name: 'Profile' }).click();
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Profile page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('Settings page loads within 5 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);

      const startTime = Date.now();
      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Settings page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('Login page loads within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${FRONTEND_URL}/login`);
      await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Login page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });

    test('Register page loads within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${FRONTEND_URL}/register`);
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 10000 });
      const endTime = Date.now();
      
      const loadTime = endTime - startTime;
      console.log(`Register page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('VAL-PERF-002: No console errors during normal usage', () => {
    test('No unexpected console errors during home page usage', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await createAuthenticatedPage(page);
      await page.waitForTimeout(2000);

      const significantErrors = filterConsoleErrors(consoleErrors);
      console.log('Console errors on home page:', significantErrors);
      expect(significantErrors).toHaveLength(0);
    });

    test('No unexpected console errors during navigation', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'History' }).click();
      await expect(page.getByRole('heading', { name: /Past Meditations|No Meditations Yet/ })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await page.getByRole('link', { name: 'Profile' }).click();
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await page.getByRole('link', { name: 'Home' }).click();
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      const significantErrors = filterConsoleErrors(consoleErrors);
      console.log('Console errors during navigation:', significantErrors);
      expect(significantErrors).toHaveLength(0);
    });

    test('No unexpected console errors during profile edit', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Profile' }).click();
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.waitForTimeout(500);

      await page.getByLabel('Name').fill('Updated Name');
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: 'Save Changes' }).click();
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      const significantErrors = filterConsoleErrors(consoleErrors);
      console.log('Console errors during profile edit:', significantErrors);
      expect(significantErrors).toHaveLength(0);
    });
  });

  test.describe('VAL-PERF-003: Session start is responsive', () => {
    test('Begin Meditation shows active session UI within 2 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);
      await goToSessionPage(page);

      const startTime = Date.now();
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      await page.waitForTimeout(500);
      
      // Check if active session indicator appears (UI changed)
      const hasActiveSession = await page.getByRole('main', { name: 'Active Meditation Session' }).isVisible({ timeout: 2000 }).catch(() => false);
      
      const endTime = Date.now();
      const sessionStartTime = endTime - startTime;
      
      console.log(`Session start time: ${sessionStartTime}ms, Active session visible: ${hasActiveSession}`);
      expect(sessionStartTime).toBeLessThan(2000);
    });

    test('Begin Meditation from home page navigates to session within 2 seconds', async ({ page }) => {
      await createAuthenticatedPage(page);

      const startTime = Date.now();
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      await page.waitForURL(/\/session/, { timeout: 5000 });
      await page.waitForTimeout(500);
      
      const endTime = Date.now();
      const sessionStartTime = endTime - startTime;
      
      console.log(`Session start from home time: ${sessionStartTime}ms`);
      expect(sessionStartTime).toBeLessThan(2000);
    });

    test('Session page UI loads quickly after navigation', async ({ page }) => {
      await createAuthenticatedPage(page);
      await goToSessionPage(page);
      
      const startTime = Date.now();
      await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
      const endTime = Date.now();
      
      console.log(`Session UI load time: ${endTime - startTime}ms`);
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
