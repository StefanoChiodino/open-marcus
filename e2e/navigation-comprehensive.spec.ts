import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Navigation Tests
 * 
 * Tests all navigation flows:
 * - VAL-NAV-001: All sidebar links navigate to correct pages
 * - VAL-NAV-002: Active page is highlighted in sidebar (only one active item)
 * - VAL-NAV-003: Mobile bottom nav works at 375px
 * - VAL-NAV-004: Page content matches URL (no content bleeding)
 * - VAL-NAV-005: Sidebar is sticky on scroll
 */

const FRONTEND_URL = 'http://localhost:3101';
const BACKEND_URL = 'http://localhost:3100';
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 667 };

/**
 * Helper: Register a test user and get auth token
 */
async function registerAndGetToken(): Promise<string> {
  const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `navuser_${Date.now()}_${Math.random().toString(36).substring(7)}`, password: 'TestPassword123!' }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Failed to register: ${registerResponse.status}`);
  }

  const { token } = await registerResponse.json();
  return token;
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
 * Helper: Create an authenticated page with profile
 */
async function createAuthenticatedPage(page: Page, name: string = 'Nav Test User'): Promise<string> {
  // First, register and get token
  const token = await registerAndGetToken();

  // Navigate to app FIRST
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Store token in localStorage for API calls
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

    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }

  // Wait for home page to fully load with profile info
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });

  return token;
}

/**
 * Helper: Set viewport and wait for responsive layout
 */
async function setViewport(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.waitForTimeout(300); // Wait for responsive CSS to apply
}

test.describe('Comprehensive Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
  });

  test.describe('VAL-NAV-001: All sidebar links navigate to correct pages', () => {
    test('Home link navigates to home page', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate away from home first
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });

      // Click Home in sidebar
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');

      // Should be on home page with welcome message
      await expect(page).toHaveURL(/\/$|\/\/$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
    });

    test('Meditation link navigates to session page', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Click Meditation in sidebar
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Should be on session page
      await expect(page).toHaveURL(/\/session/, { timeout: 10000 });
      await expect(page.getByRole('main', { name: 'Meditation Session' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
    });

    test('History link navigates to history page', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Click History in sidebar
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      // Should be on history page
      await expect(page).toHaveURL(/\/history/, { timeout: 10000 });
      await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();
    });

    test('Profile link navigates to profile page', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Click Profile in sidebar
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Should be on profile page
      await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    });

    test('Settings link navigates to settings page', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Click Settings in sidebar
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Should be on settings page
      await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    });

    test('can navigate to all pages and return home', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Start at home
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });

      // Go through each page
      const pages = [
        { name: 'Meditation', heading: 'Meditation with Marcus Aurelius' },
        { name: 'History', heading: 'No Meditations Yet' },
        { name: 'Profile', heading: 'Profile Settings' },
        { name: 'Settings', heading: 'Settings' },
      ];

      for (const p of pages) {
        await page.getByRole('link', { name: p.name }).click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: p.heading })).toBeVisible({ timeout: 10000 });
      }

      // Return to Home
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
    });
  });

  test.describe('VAL-NAV-002: Active page is highlighted in sidebar', () => {
    test('only one nav item is active at a time', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Home should be active initially
      await expect(page.getByRole('link', { name: 'Home' })).toHaveClass(/navigation__link--active/);

      // Navigate to Meditation - only Meditation should be active
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByRole('link', { name: 'Meditation' })).toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Home' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'History' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Profile' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Settings' })).not.toHaveClass(/navigation__link--active/);

      // Navigate to History - only History should be active
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByRole('link', { name: 'History' })).toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Home' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Meditation' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Profile' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Settings' })).not.toHaveClass(/navigation__link--active/);

      // Navigate to Profile - only Profile should be active
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByRole('link', { name: 'Profile' })).toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Home' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Meditation' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'History' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Settings' })).not.toHaveClass(/navigation__link--active/);

      // Navigate to Settings - only Settings should be active
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByRole('link', { name: 'Settings' })).toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Home' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Meditation' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'History' })).not.toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('link', { name: 'Profile' })).not.toHaveClass(/navigation__link--active/);
    });

    test('active state persists during session', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to Meditation and start session
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('link', { name: 'Meditation' })).toHaveClass(/navigation__link--active/);

      // Start meditation
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Meditation link should still be active
      await expect(page.getByRole('link', { name: 'Meditation' })).toHaveClass(/navigation__link--active/);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Meditation should still be active after reload (URL is /session)
      await expect(page.getByRole('link', { name: 'Meditation' })).toHaveClass(/navigation__link--active/);
    });
  });

  test.describe('VAL-NAV-003: Mobile bottom nav works at 375px', () => {
    test('bottom nav is visible at mobile viewport', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Navigation should be at bottom of screen
      const navBox = await page.locator('.navigation').boundingBox();
      expect(navBox).toBeTruthy();
      expect(navBox!.y).toBeGreaterThan(MOBILE.height - 100); // At bottom

      // Key navigation links should be visible
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Meditation' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
    });

    test('bottom nav links navigate correctly at mobile', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Navigate to Meditation using bottom nav
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();

      // Navigate to History using bottom nav
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();

      // Navigate to Home using bottom nav
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    });

    test('logout button is not visible in mobile bottom nav', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Logout button should not be visible in mobile bottom nav
      await expect(page.getByRole('button', { name: 'Log out of your account' })).not.toBeVisible();
    });

    test('bottom nav is fixed and does not scroll with content', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Get initial nav position
      const navBoxInitial = await page.locator('.navigation').boundingBox();
      expect(navBoxInitial!.y).toBeGreaterThan(MOBILE.height - 100);

      // Scroll down
      const mainContent = page.locator('.app-layout__main');
      await mainContent.evaluate((el: HTMLElement) => el.scrollTop = 300);
      await page.waitForTimeout(300);

      // Nav should still be at bottom
      const navBoxAfter = await page.locator('.navigation').boundingBox();
      expect(navBoxAfter!.y).toBeGreaterThan(MOBILE.height - 100);

      // Nav y position should not have changed significantly (fixed position)
      expect(Math.abs(navBoxAfter!.y - navBoxInitial!.y)).toBeLessThan(10);
    });

    test('home page is usable at mobile with bottom nav', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Welcome heading should be visible above bottom nav
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();

      // Begin meditation button should be visible
      await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();

      // Content should have padding to avoid bottom nav overlap
      const mainContent = page.locator('.app-layout__main');
      const mainBox = await mainContent.boundingBox();
      expect(mainBox!.height).toBeLessThanOrEqual(MOBILE.height);
    });

    test('settings page works at mobile with bottom nav', async ({ page }) => {
      await createAuthenticatedPage(page);
      await setViewport(page, MOBILE);

      // Navigate to Settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Settings heading should be visible
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      // Export button should be accessible
      await expect(page.getByRole('button', { name: 'Download JSON Export' })).toBeVisible();

      // Bottom nav should still be visible
      const navBox = await page.locator('.navigation').boundingBox();
      expect(navBox!.y).toBeGreaterThan(MOBILE.height - 100);
    });
  });

  test.describe('VAL-NAV-004: Page content matches URL', () => {
    test('home URL shows home content', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Verify URL is /
      await expect(page).toHaveURL(/\/$|\/\/$/);

      // Verify home content
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
    });

    test('session URL shows session content', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to session
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Verify URL is /session
      await expect(page).toHaveURL(/\/session/);

      // Verify session content
      await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
    });

    test('history URL shows history content', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to history
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      // Verify URL is /history
      await expect(page).toHaveURL(/\/history/);

      // Verify history content
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();
    });

    test('profile URL shows profile content', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Verify URL is /profile
      await expect(page).toHaveURL(/\/profile/);

      // Verify profile content
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    });

    test('settings URL shows settings content', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Verify URL is /settings
      await expect(page).toHaveURL(/\/settings/);

      // Verify settings content
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });

    test('no content bleeding between pages', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings page
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      // Home page content should NOT be visible
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).not.toBeVisible();

      // Session page content should NOT be visible
      await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).not.toBeVisible();

      // Navigate to history page
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();

      // Settings page content should NOT be visible
      await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
    });
  });

  test.describe('VAL-NAV-005: Sidebar is sticky on scroll', () => {
    test('sidebar stays fixed at top when scrolling', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(DESKTOP);

      // Navigate to settings (tall page)
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      // Get initial nav position
      const navBefore = await page.locator('.navigation').boundingBox();
      expect(navBefore!.y).toBe(0); // Should be at top

      // Scroll down
      const mainContent = page.locator('.app-layout__main');
      await mainContent.hover();
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);

      // Nav should STILL be at y=0 (sticky behavior)
      const navAfter = await page.locator('.navigation').boundingBox();
      expect(navAfter!.y).toBe(0);

      // Logout button should still be visible
      await expect(page.getByRole('button', { name: 'Log out of your account' })).toBeVisible();
    });

    test('sidebar covers full height on desktop', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(DESKTOP);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Nav should be full viewport height
      const navBox = await page.locator('.navigation').boundingBox();
      expect(navBox!.height).toBe(DESKTOP.height);
      expect(navBox!.y).toBe(0);
    });

    test('sidebar is sticky on session page with active session', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(DESKTOP);

      // Navigate to session and start
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Get initial nav position
      const navBefore = await page.locator('.navigation').boundingBox();
      expect(navBefore!.y).toBe(0);

      // Scroll down
      const mainContent = page.locator('.app-layout__main');
      await mainContent.hover();
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);

      // Nav should STILL be at y=0
      const navAfter = await page.locator('.navigation').boundingBox();
      expect(navAfter!.y).toBe(0);
    });

    test('logout button is always visible in sticky sidebar', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(DESKTOP);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Scroll to bottom of settings
      const mainContent = page.locator('.app-layout__main');
      await mainContent.evaluate((el: HTMLElement) => el.scrollTop = 1000);
      await page.waitForTimeout(300);

      // Logout button should still be visible
      const logoutBox = await page.locator('.navigation__logout-button').boundingBox();
      expect(logoutBox).toBeTruthy();
      expect(logoutBox!.y).toBeGreaterThanOrEqual(0); // Within viewport
      expect(logoutBox!.y + logoutBox!.height).toBeLessThanOrEqual(DESKTOP.height);
    });
  });

  test.describe('Cross-cutting navigation concerns', () => {
    test('layout adapts correctly when resizing viewport', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Start at desktop
      await setViewport(page, DESKTOP);
      let navBox = await page.locator('.navigation').boundingBox();
      expect(navBox!.y).toBe(0); // Left sidebar at top
      expect(navBox!.width).toBeGreaterThanOrEqual(200);

      // Resize to tablet
      await setViewport(page, { width: 768, height: 1024 });
      navBox = await page.locator('.navigation').boundingBox();
      expect(navBox!.y).toBe(0); // Still left sidebar
      expect(navBox!.width).toBe(64); // Collapsed

      // Resize to mobile
      await setViewport(page, MOBILE);
      navBox = await page.locator('.navigation').boundingBox();
      expect(navBox!.y).toBeGreaterThan(MOBILE.height - 100); // Bottom nav

      // Logout not visible in mobile
      await expect(page.getByRole('button', { name: 'Log out of your account' })).not.toBeVisible();
    });

    test('navigation state is correct after direct URL access', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Directly navigate to history
      await page.goto(`${FRONTEND_URL}/history`);
      await page.waitForLoadState('networkidle');

      // History should be active
      await expect(page).toHaveURL(/\/history/);
      await expect(page.getByRole('link', { name: 'History' })).toHaveClass(/navigation__link--active/);
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();

      // Other nav items should not be active
      await expect(page.getByRole('link', { name: 'Home' })).not.toHaveClass(/navigation__link--active/);
    });

    test('back navigation works correctly', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

      // Go back
      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();

      // Settings should no longer be active
      await expect(page.getByRole('link', { name: 'Settings' })).not.toHaveClass(/navigation__link--active/);
    });
  });
});
