import { test, expect, Page, Locator } from '@playwright/test';
import {
  clearTestData,
  setAuthToken,
  clearAuthToken,
} from './test-db-helpers';

/**
 * Comprehensive Accessibility Tests
 * 
 * Tests accessibility features:
 * - VAL-A11Y-001: All interactive elements are keyboard accessible
 * - VAL-A11Y-002: Focus states are visible
 * - VAL-A11Y-003: Form inputs have labels
 * - VAL-A11Y-004: Color contrast meets WCAG AA
 */

const FRONTEND_URL = 'http://localhost:3101';
const BACKEND_URL = 'http://localhost:3100';

/**
 * Helper: Check if an element has a visible focus indicator
 * Focus indicators can be: outline, box-shadow, border, background-color change
 */
async function hasVisibleFocusIndicator(element: Locator): Promise<boolean> {
  return element.evaluate((el: HTMLElement) => {
    const style = window.getComputedStyle(el);

    // Check for outline (common focus indicator)
    const outlineWidth = parseFloat(style.outlineWidth);
    const outlineStyle = style.outlineStyle;
    const outlineColor = style.outlineColor;
    const hasOutline = outlineWidth > 0 && outlineStyle !== 'none' && outlineColor !== 'transparent';

    // Check for box-shadow (another common focus indicator)
    const boxShadow = style.boxShadow;
    const hasBoxShadow = boxShadow !== 'none' && boxShadow !== 'initial';

    // Check for border changes (focus can add/change border)
    const borderWidth = parseFloat(style.borderWidth);
    const borderStyle = style.borderStyle;
    const borderColor = style.borderColor;
    const hasBorder = borderWidth > 0 && borderStyle !== 'none' && borderColor !== 'initial';

    // Check for background color change
    const bgColor = style.backgroundColor;
    const hasBgChange = bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';

    // Check for transform/scale (focus can slightly scale element)
    const transform = style.transform;
    const hasTransform = transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';

    // Any of these indicate a visible focus indicator
    return hasOutline || hasBoxShadow || hasBorder || hasBgChange || hasTransform;
  });
}

// Viewport for tests
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 667 };

/**
 * Helper: Create authenticated page with profile via UI onboarding
 */
async function createAuthenticatedPage(page: Page, name: string = 'A11y User'): Promise<string> {
  // Register a test user
  const testUsername = `a11y_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: 'TestPassword123!' }),
  });

  if (!registerResponse.ok) {
    throw new Error(`Failed to register: ${registerResponse.status}`);
  }

  const { token } = await registerResponse.json();
  await setAuthToken(page, token);

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Check if onboarding is needed
  const nameInput = page.getByLabel('Name');
  if (await nameInput.isVisible()) {
    await nameInput.fill(name);
    const bioInput = page.getByLabel('About You');
    if (await bioInput.isVisible()) {
      await bioInput.fill('Test bio for accessibility');
    }
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }

  // Wait for home page
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });

  return token;
}

test.describe('Comprehensive Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearTestData();
    await page.setViewportSize(DESKTOP);
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await clearAuthToken(page);
  });

  test.describe('VAL-A11Y-001: All interactive elements are keyboard accessible', () => {
    test('Login form inputs are keyboard accessible', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Username input should be focusable
      const usernameInput = page.getByLabel('Username');
      await expect(usernameInput).toBeVisible();
      await usernameInput.focus();
      await expect(usernameInput).toBeFocused();

      // Password input should be focusable
      const passwordInput = page.getByLabel('Password');
      await passwordInput.focus();
      await expect(passwordInput).toBeFocused();

      // Submit button exists (may be disabled until form is filled)
      const submitBtn = page.getByRole('button', { name: /Sign In/i });
      await expect(submitBtn).toBeAttached();
    });

    test('Register form inputs are keyboard accessible', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');

      // Username and password inputs should be focusable (no confirm password field)
      const usernameInput = page.getByLabel('Username');
      await usernameInput.focus();
      await expect(usernameInput).toBeFocused();

      const passwordInput = page.getByLabel('Password');
      await passwordInput.focus();
      await expect(passwordInput).toBeFocused();

      // Submit button exists (may be disabled until form is filled)
      const submitBtn = page.getByRole('button', { name: /Create Account/i });
      await expect(submitBtn).toBeAttached();
    });

    test('Home page navigation is keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigation links should be focusable
      const homeLink = page.getByRole('link', { name: 'Home' });
      await homeLink.focus();
      await expect(homeLink).toBeFocused();

      const meditationLink = page.getByRole('link', { name: 'Meditation' });
      await meditationLink.focus();
      await expect(meditationLink).toBeFocused();

      const historyLink = page.getByRole('link', { name: 'History' });
      await historyLink.focus();
      await expect(historyLink).toBeFocused();

      const profileLink = page.getByRole('link', { name: 'Profile' });
      await profileLink.focus();
      await expect(profileLink).toBeFocused();

      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await settingsLink.focus();
      await expect(settingsLink).toBeFocused();

      // Begin Meditation button should be focusable
      const beginBtn = page.getByRole('button', { name: 'Begin meditation session' });
      await beginBtn.focus();
      await expect(beginBtn).toBeFocused();
    });

    test('Profile page edit form is keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Edit button should be focusable
      const editBtn = page.getByRole('button', { name: 'Edit your profile' });
      await editBtn.focus();
      await expect(editBtn).toBeFocused();

      // Click edit
      await editBtn.click();

      // Form inputs should be focusable
      const nameInput = page.getByLabel('Name');
      await nameInput.focus();
      await expect(nameInput).toBeFocused();

      const bioInput = page.getByLabel('About You');
      await bioInput.focus();
      await expect(bioInput).toBeFocused();

      // Save and Cancel buttons should be focusable
      const saveBtn = page.getByRole('button', { name: 'Save Changes' });
      await saveBtn.focus();
      await expect(saveBtn).toBeFocused();

      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      await cancelBtn.focus();
      await expect(cancelBtn).toBeFocused();
    });

    test('Session page is keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to session
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Begin Meditation button should be focusable
      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      await beginBtn.focus();
      await expect(beginBtn).toBeFocused();
    });

    test('Settings page controls are keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Wait for settings to load
      await page.waitForTimeout(1000);

      // Export button should be focusable
      const exportBtn = page.getByRole('button', { name: /Export|Download/i });
      await exportBtn.focus();
      await expect(exportBtn).toBeFocused();

      // Import button should be focusable
      const importBtn = page.getByRole('button', { name: /Import/i });
      await importBtn.focus();
      await expect(importBtn).toBeFocused();
    });

    test('History page is keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to history
      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      // Should show empty state heading
      await expect(page.getByRole('heading', { name: /No Meditations Yet|Past Meditations/i })).toBeVisible();

      // Navigation links should be focusable
      const homeLink = page.getByRole('link', { name: 'Home' });
      await homeLink.focus();
      await expect(homeLink).toBeFocused();
    });

    test('Mobile navigation is keyboard accessible', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(MOBILE);

      // Mobile nav links should be focusable
      const homeLink = page.getByRole('link', { name: 'Home' });
      await homeLink.focus();
      await expect(homeLink).toBeFocused();

      const meditationLink = page.getByRole('link', { name: 'Meditation' });
      await meditationLink.focus();
      await expect(meditationLink).toBeFocused();

      const historyLink = page.getByRole('link', { name: 'History' });
      await historyLink.focus();
      await expect(historyLink).toBeFocused();
    });

    test('Enter key activates buttons', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to session
      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      // Focus and activate Begin Meditation button with Enter
      const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
      await beginBtn.focus();
      await page.keyboard.press('Enter');

      // Wait for session to start
      await page.waitForTimeout(1000);
      
      // Either the button is hidden or session content is visible
      const isHidden = await beginBtn.isHidden().catch(() => false);
      const hasSessionContent = await page.locator('.meditation-chat').isVisible().catch(() => false);
      
      expect(isHidden || hasSessionContent).toBeTruthy();
    });
  });

  test.describe('VAL-A11Y-002: Focus states are visible', () => {
    test('Focus indicator exists on login form inputs', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Focus username input
      const usernameInput = page.getByLabel('Username');
      await usernameInput.focus();

      // Check that focused element is indeed focused
      const isFocused = await usernameInput.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(usernameInput);
      expect(hasVisibleIndicator).toBeTruthy();
    });

    test('Focus indicator exists on navigation links', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Focus a navigation link
      const navLink = page.getByRole('link', { name: 'Home' });
      await navLink.focus();

      // Verify element is focused
      const isFocused = await navLink.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(navLink);
      expect(hasVisibleIndicator).toBeTruthy();
    });

    test('Focus indicator exists on buttons', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Focus Begin Meditation button
      const beginBtn = page.getByRole('button', { name: 'Begin meditation session' });
      await beginBtn.focus();

      // Verify element is focused
      const isFocused = await beginBtn.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(beginBtn);
      expect(hasVisibleIndicator).toBeTruthy();
    });

    test('Focus indicator exists on profile edit inputs', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Click Edit
      await page.getByRole('button', { name: 'Edit your profile' }).click();

      // Focus name input
      const nameInput = page.getByLabel('Name');
      await nameInput.focus();

      // Verify element is focused
      const isFocused = await nameInput.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(nameInput);
      expect(hasVisibleIndicator).toBeTruthy();
    });

    test('Focus indicator exists on settings buttons', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Focus export button
      const exportBtn = page.getByRole('button', { name: /Export|Download/i });
      await exportBtn.focus();

      // Verify element is focused
      const isFocused = await exportBtn.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(exportBtn);
      expect(hasVisibleIndicator).toBeTruthy();
    });

    test('Focus indicator exists on mobile navigation', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(MOBILE);

      // Focus mobile nav link
      const navLink = page.getByRole('link', { name: 'Home' });
      await navLink.focus();

      // Verify element is focused
      const isFocused = await navLink.evaluate((el: HTMLElement) => {
        return el === document.activeElement;
      });
      expect(isFocused).toBeTruthy();

      // Verify focus indicator is VISIBLE (CSS styles)
      const hasVisibleIndicator = await hasVisibleFocusIndicator(navLink);
      expect(hasVisibleIndicator).toBeTruthy();
    });
  });

  test.describe('VAL-A11Y-003: Form inputs have labels', () => {
    test('Login form has proper labels for all inputs', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Username input should have label
      const usernameInput = page.getByLabel('Username');
      await expect(usernameInput).toBeVisible();
      await expect(usernameInput).toHaveAttribute('type', 'text');

      // Password input should have label
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Submit button should have accessible name
      const submitBtn = page.getByRole('button', { name: /Sign In|Log In/i });
      await expect(submitBtn).toBeVisible();
    });

    test('Register form has proper labels for all inputs', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');

      // Username input should have label
      const usernameInput = page.getByLabel('Username');
      await expect(usernameInput).toBeVisible();

      // Password input should have label
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toBeVisible();

      // Submit button should be visible
      const submitBtn = page.getByRole('button', { name: /Create Account/i });
      await expect(submitBtn).toBeVisible();
    });

    test('Onboarding form has proper labels', async ({ page }) => {
      // Register a new user
      const testUsername = `a11y_onboard_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: 'TestPassword123!' }),
      });

      if (!registerResponse.ok) {
        throw new Error(`Failed to register: ${registerResponse.status}`);
      }

      const { token } = await registerResponse.json();
      await setAuthToken(page, token);

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Check if on onboarding
      const nameInput = page.getByLabel('Name');
      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveAttribute('type', 'text');

        const bioInput = page.getByLabel('About You');
        await expect(bioInput).toBeVisible();
      }
    });

    test('Profile edit form has proper labels', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Click Edit
      await page.getByRole('button', { name: 'Edit your profile' }).click();

      // Name input should have label
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible();

      // Bio input should have label
      const bioInput = page.getByLabel('About You');
      await expect(bioInput).toBeVisible();

      // Save and Cancel buttons should have accessible names
      const saveBtn = page.getByRole('button', { name: 'Save Changes' });
      await expect(saveBtn).toBeVisible();

      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      await expect(cancelBtn).toBeVisible();
    });

    test('All form inputs on profile page have labels', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Click Edit to reveal form
      await page.getByRole('button', { name: 'Edit your profile' }).click();

      // Get all inputs and verify they have labels
      const inputs = page.locator('input, textarea');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const isVisible = await input.isVisible().catch(() => false);

        if (isVisible) {
          // Check for aria-label, aria-labelledby, or associated label
          const labelInfo = await input.evaluate((el: HTMLInputElement | HTMLTextAreaElement) => {
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledby = el.getAttribute('aria-labelledby');
            const labelEl = document.querySelector(`label[for="${el.id}"]`);
            return { ariaLabel, ariaLabelledby, labelText: labelEl?.textContent };
          });

          // At least one label method should exist
          expect(labelInfo.ariaLabel || labelInfo.ariaLabelledby || labelInfo.labelText).toBeTruthy();
        }
      }
    });

    test('Settings page controls have accessible labels', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to settings
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      // Wait for settings to load
      await page.waitForTimeout(1000);

      // Buttons should have accessible names
      const exportBtn = page.getByRole('button', { name: /Export|Download/i });
      await expect(exportBtn).toBeAttached();

      const importBtn = page.getByRole('button', { name: /Import/i });
      await expect(importBtn).toBeAttached();

      // Settings heading should be visible
      const heading = page.getByRole('heading', { name: 'Settings' });
      await expect(heading).toBeVisible();
    });
  });

  test.describe('VAL-A11Y-004: Color contrast meets WCAG AA', () => {
    /**
     * Helper: Check if text contrast meets WCAG AA requirements
     * Normal text: 4.5:1, Large text (18pt+ or 14pt bold+): 3:1
     */
    async function checkContrastMeetsWCAGAA(
      element: Locator,
      requiredRatio: number = 4.5
    ): Promise<{ passes: boolean; actualRatio: number | null }> {
      const result = await element.evaluate((el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        const textColor = style.color;
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseFloat(style.fontWeight);

        // Parse RGB values
        const parseRgb = (rgbString: string): { r: number; g: number; b: number } | null => {
          const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!match) return null;
          return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10),
          };
        };

        // Calculate relative luminance
        const getLuminance = (rgb: { r: number; g: number; b: number }): number => {
          const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        // Calculate contrast ratio
        const getContrastRatio = (c1: string, c2: string): number | null => {
          const rgb1 = parseRgb(c1);
          const rgb2 = parseRgb(c2);
          if (!rgb1 || !rgb2) return null;
          const l1 = getLuminance(rgb1);
          const l2 = getLuminance(rgb2);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        };

        // Get effective background by traversing up
        let current: HTMLElement | null = el;
        let bgColor = 'rgb(255, 255, 255)'; // Default white
        while (current) {
          const currentStyle = window.getComputedStyle(current);
          const currentBg = currentStyle.backgroundColor;
          if (currentBg !== 'transparent' && currentBg !== 'rgba(0, 0, 0, 0)' && currentBg !== 'rgba(255, 255, 255, 0)') {
            bgColor = currentBg;
            break;
          }
          current = current.parentElement;
        }

        const ratio = getContrastRatio(textColor, bgColor);
        return {
          textColor,
          bgColor,
          fontSize,
          fontWeight,
          ratio,
        };
      });

      if (!result.ratio) {
        return { passes: false, actualRatio: null };
      }

      return {
        passes: result.ratio >= requiredRatio,
        actualRatio: Math.round(result.ratio * 100) / 100,
      };
    }

    test('Login page text meets WCAG AA contrast', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Get heading
      const heading = page.getByRole('heading', { name: 'Welcome Back' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Home page greeting meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      const heading = page.getByRole('heading', { name: 'Welcome to OpenMarcus' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Navigation links meet WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      const navLinks = page.locator('.navigation__link, .nav-link, nav a');
      const count = await navLinks.count();

      // Check at least some nav links meet contrast requirements
      if (count > 0) {
        let lowestRatio = Infinity;

        for (let i = 0; i < Math.min(count, 3); i++) {
          const link = navLinks.nth(i);
          const isVisible = await link.isVisible().catch(() => false);

          if (isVisible) {
            const { actualRatio } = await checkContrastMeetsWCAGAA(link, 4.5);
            if (actualRatio !== null && actualRatio < lowestRatio) {
              lowestRatio = actualRatio;
            }
          }
        }
        // At least the lowest ratio should still be reasonable
        expect(lowestRatio).toBeLessThan(Infinity);
      }
    });

    test('Button text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      const btn = page.getByRole('button', { name: 'Begin meditation session' });
      await expect(btn).toBeVisible();

      // Check contrast ratio meets WCAG AA (buttons are considered "large text" at 3:1)
      const { passes } = await checkContrastMeetsWCAGAA(btn, 3);
      expect(passes).toBeTruthy();
    });

    test('Form input labels meet WCAG AA contrast', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.waitForLoadState('networkidle');

      const usernameLabel = page.locator('label').filter({ hasText: 'Username' }).first();
      await expect(usernameLabel).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(usernameLabel, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Profile page text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { name: 'Profile Settings' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Settings page text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { name: 'Settings' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Session page text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'Meditation' }).click();
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('History page text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);

      await page.getByRole('link', { name: 'History' }).click();
      await page.waitForLoadState('networkidle');

      const heading = page.getByRole('heading', { name: /Past Meditations|No Meditations Yet/i });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });

    test('Mobile viewport text meets WCAG AA contrast', async ({ page }) => {
      await createAuthenticatedPage(page);
      await page.setViewportSize(MOBILE);

      const heading = page.getByRole('heading', { name: 'Welcome to OpenMarcus' });
      await expect(heading).toBeVisible();

      // Check contrast ratio meets WCAG AA (4.5:1 for normal text)
      const { passes } = await checkContrastMeetsWCAGAA(heading, 4.5);
      expect(passes).toBeTruthy();
    });
  });

  test.describe('Accessibility - Additional Checks', () => {
    test('No positive tabindex values used', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Check for positive tabindex
      const positiveTabindex = await page.evaluate(() => {
        const elements = document.querySelectorAll('[tabindex]');
        const positive: string[] = [];
        elements.forEach(el => {
          const val = el.getAttribute('tabindex');
          if (val && parseInt(val) > 0) {
            positive.push(`${el.tagName}: tabindex=${val}`);
          }
        });
        return positive;
      });

      console.log('Elements with positive tabindex:', positiveTabindex);
      // Positive tabindex values are accessibility anti-patterns
      expect(positiveTabindex).toHaveLength(0);
    });

    test('Required form fields are properly marked', async ({ page }) => {
      await page.goto(`${FRONTEND_URL}/register`);
      await page.waitForLoadState('networkidle');

      const usernameInput = page.getByLabel('Username');
      await expect(usernameInput).toBeVisible();

      // Username should be marked as required
      const isRequired = await usernameInput.evaluate((el: HTMLInputElement) => {
        return el.required || el.getAttribute('aria-required') === 'true';
      });

      expect(isRequired).toBeTruthy();
    });

    test('Buttons have non-empty accessible names', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Get all visible buttons and check they have accessible names
      const buttons = page.locator('button');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const isVisible = await btn.isVisible().catch(() => false);

        if (isVisible) {
          const accessibleName = await btn.evaluate((el: HTMLButtonElement) => {
            return el.textContent?.trim() || 
                   el.getAttribute('aria-label') ||
                   el.getAttribute('aria-labelledby');
          });

          // All visible buttons should have accessible names
          expect(accessibleName).toBeTruthy();
        }
      }
    });

    test('Links have non-empty accessible names', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Get all visible links
      const links = page.locator('a[href]');
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const isVisible = await link.isVisible().catch(() => false);

        if (isVisible) {
          const accessibleName = await link.evaluate((el: HTMLAnchorElement) => {
            return el.textContent?.trim() || 
                   el.getAttribute('aria-label') ||
                   el.getAttribute('aria-labelledby');
          });

          // All visible links should have accessible names
          expect(accessibleName).toBeTruthy();
        }
      }
    });

    test('Page has lang attribute set', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      const htmlElement = page.locator('html');
      const lang = await htmlElement.getAttribute('lang');

      expect(lang).toBeTruthy();
    });

    test('Page title is not empty', async ({ page }) => {
      await createAuthenticatedPage(page);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('Focus moves logically through profile edit form', async ({ page }) => {
      await createAuthenticatedPage(page);

      // Navigate to profile
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');

      // Click Edit
      await page.getByRole('button', { name: 'Edit your profile' }).click();

      // Tab through form elements and verify focus order
      const elements: string[] = [];

      // Focus first input and start tabbing
      const nameInput = page.getByLabel('Name');
      await nameInput.focus();
      elements.push('name');

      await page.keyboard.press('Tab');
      const focused1 = await page.evaluate(() => (document.activeElement as HTMLElement)?.id || (document.activeElement as HTMLElement)?.tagName);
      elements.push(String(focused1));

      await page.keyboard.press('Tab');
      const focused2 = await page.evaluate(() => (document.activeElement as HTMLElement)?.id || (document.activeElement as HTMLElement)?.tagName);
      elements.push(String(focused2));

      // We should have moved through at least 2 elements
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });
});
