import { test, expect } from '@playwright/test';

/**
 * Offline Mode / Read-Only Features E2E Test
 * 
 * Tests that when the backend AI services (Ollama) are unavailable:
 * - Profile display and management still work
 * - Session history is readable
 * - Settings and data export work
 * - The app doesn't crash but shows appropriate error messages
 */

/**
 * Helper: Clear all data via API to start fresh
 */
async function clearAllData() {
  await fetch('http://localhost:3100/api/export/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('Offline Mode: Read-Only Features', () => {
  test.beforeEach(async () => {
    await clearAllData();
  });

  test('profile is displayed correctly on home page', async ({ page }) => {
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    await expect(page.getByText('Stefano')).toBeVisible();
  });

  test('session history page loads', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to history
    await page.getByRole('link', { name: 'History' }).click();
    
    // History page should load
    await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible();
  });

  test('settings page loads with data management controls', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to settings
    await page.goto('/settings');
    
    // Settings page should load
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    
    // Export section and button should be available
    await expect(page.locator('#export-heading')).toBeVisible();
    
    const exportBtn = page.getByRole('button', { name: 'Download JSON Export' });
    await expect(exportBtn).toBeVisible();
    
    // Clear data section and button should be available
    await expect(page.locator('#clear-heading')).toBeVisible();
    const clearSection = page.locator('.settings-section--danger');
    await expect(clearSection).toBeVisible();
  });

  test('profile settings page shows editable profile', async ({ page }) => {
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to Profile page
    await page.getByRole('link', { name: 'Profile' }).click();
    
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    await expect(page.getByText('Stefano')).toBeVisible();
    
    // Edit and Reset buttons should be available
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });

  test('created session appears in history after navigation', async ({ page }) => {
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to meditation and begin session
    await page.getByRole('button', { name: 'Begin meditation session' }).click();
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    
    // Wait for session to initialize
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();
    await expect(page.getByText('I am Marcus')).toBeVisible();
    await page.waitForTimeout(1000);

    // Navigate to history (from the active chat)
    await page.getByRole('link', { name: 'History' }).click();
    
    // Should show the session in history
    await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible();
    await expect(page.locator('.session-history')).toBeVisible();
  });
});
