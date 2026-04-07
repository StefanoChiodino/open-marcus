import { test, expect } from '@playwright/test';

/**
 * Cross-Flow Smoke Tests
 * 
 * Tests cross-area flows that span multiple pages and interactions:
 * - VAL-CROSS-001: Onboarding → Home → Profile flow (complete user creation journey)
 * - VAL-CROSS-002: All pages accessible via navigation sequence
 * - VAL-CROSS-003: Edit profile preserves data after navigation away and back
 * 
 * Fulfills: VAL-CROSS-001, VAL-CROSS-002, VAL-CROSS-003
 */

/**
 * Helper: Navigate to profile page using sidebar
 */
async function goToProfilePage(page: any) {
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
}

test.describe('Cross-Flow Smoke Tests', () => {
  test.describe.configure({ mode: 'serial' });
  
  /**
   * Helper to set up a fresh user with profile for cross-flow tests.
   * This registers a NEW user (avoiding autofill issues) and creates a profile.
   */
  async function setupFreshUser(page: any, name: string, bio?: string) {
    // Navigate to register page to create a completely new user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Fill in registration form - use unique username to avoid conflicts
    const username = `crossflow_${Date.now()}`;
    const password = 'TestPassword123!';
    
    // Use pressSequentially to type character by character, which properly triggers React events
    await page.getByLabel('Username').pressSequentially(username, { delay: 10 });
    await page.getByLabel('Password').pressSequentially(password, { delay: 10 });
    
    // Wait for button to become enabled (form validation)
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled({ timeout: 5000 });
    
    // Click Create Account button
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Wait for registration to complete and redirect to home/onboarding
    await page.waitForLoadState('networkidle');
    
    // If we see the onboarding form (ProfileForm), fill it in
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(name);
      
      if (bio) {
        const bioInput = page.getByLabel('About You');
        await bioInput.fill(bio);
      }
      
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for home page to fully load
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
  }

  test('VAL-CROSS-001: Onboarding → Home → Profile flow', async ({ page }) => {
    // Step 1: Register a new user - this creates a fresh account
    await setupFreshUser(page, 'CrossFlow User', 'Testing cross-flow navigation');
    
    // Should be redirected to home page with personalized greeting
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    await expect(page.getByText('Welcome, CrossFlow User')).toBeVisible();
    
    // Step 2: Navigate to profile page - profile should be displayed
    await goToProfilePage(page);
    
    // Profile should show the created name and bio
    await expect(page.getByText('CrossFlow User')).toBeVisible();
    await expect(page.getByText('Testing cross-flow navigation')).toBeVisible();
    
    // Action buttons should be visible
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
    
    // Step 3: Edit profile - save should work and show updated profile
    await page.getByRole('button', { name: 'Edit your profile' }).click();
    
    // Edit form should be visible with pre-filled values
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
    
    const editNameInput = page.getByLabel('Name');
    await expect(editNameInput).toHaveValue('CrossFlow User');
    
    const editBioInput = page.getByLabel('About You');
    await expect(editBioInput).toHaveValue('Testing cross-flow navigation');
    
    // Change the name and bio
    await editNameInput.fill('Updated CrossFlow User');
    await editBioInput.fill('Updated bio after edit');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(1000);
    
    // Should see updated profile in display mode - profile heading should be visible
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    
    // Updated bio should be visible in profile display (it's in a paragraph)
    await expect(page.locator('p', { hasText: 'Updated bio after edit' })).toBeVisible();
    
    // Original bio should NOT be present in profile display
    await expect(page.locator('p', { hasText: 'Testing cross-flow navigation' })).not.toBeVisible();
    
    // Action buttons should be visible again
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });

  test('VAL-CROSS-002: All pages accessible via navigation sequence', async ({ page }) => {
    // Set up a fresh user with profile
    await setupFreshUser(page, 'Navigation Sequence User', 'Testing all pages');
    
    // Start at home page
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
    
    // Navigate to Meditation page
    await page.getByRole('link', { name: 'Meditation' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Meditation Session' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
    
    // Navigate to History page
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();
    
    // Navigate to Profile page
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    await expect(page.getByText('Navigation Sequence User')).toBeVisible();
    
    // Navigate to Settings page
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    
    // Return to Home page
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
    await expect(page.getByText('Welcome, Navigation Sequence User')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
  });

  test('VAL-CROSS-003: Edit profile preserves data after navigation away and back', async ({ page }) => {
    // Set up a fresh user with profile
    await setupFreshUser(page, 'Original Name', 'Original bio');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Verify initial profile is displayed
    await expect(page.getByText('Original Name')).toBeVisible();
    await expect(page.getByText('Original bio')).toBeVisible();
    
    // Edit the profile name to "Test User"
    await page.getByRole('button', { name: 'Edit your profile' }).click();
    
    // Form should be visible with pre-filled values
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
    
    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toHaveValue('Original Name');
    
    // Change name to "Test User"
    await nameInput.fill('Test User');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(1000);
    
    // Updated name should be visible
    await expect(page.locator('p', { hasText: 'Test User' })).toBeVisible();
    
    // Navigate away to Settings page
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on Settings page
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    
    // Navigate back to Profile page
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify "Test User" is still displayed (data persisted)
    await expect(page.locator('p', { hasText: 'Test User' })).toBeVisible();
    
    // Original name should NOT be present
    await expect(page.locator('p', { hasText: 'Original Name' })).not.toBeVisible();
    
    // Action buttons should still be visible
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });
});
