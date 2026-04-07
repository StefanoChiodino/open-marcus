import { test, expect } from '@playwright/test';

/**
 * Profile Page Smoke Tests
 * 
 * Tests the profile page interactions:
 * - Edit Profile button shows form with pre-filled values
 * - Cancel returns to display mode without changes
 * - Save persists changes and shows updated profile
 * - Reset clears profile and shows onboarding
 * 
 * Fulfills: VAL-PROFILE-001, VAL-PROFILE-002, VAL-PROFILE-003, VAL-PROFILE-004
 */

/**
 * Helper: Register a test user and get auth token
 */
async function registerAndGetToken(): Promise<string> {
  const registerResponse = await fetch('http://localhost:3100/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `testuser_${Date.now()}`, password: 'testpassword123' }),
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
  const response = await fetch('http://localhost:3100/api/export/clear', {
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
 * Helper: Create a profile with the given name and bio
 */
async function createProfile(page: any, name: string, bio?: string) {
  // First, register and get token
  const token = await registerAndGetToken();
  
  // Navigate to app
  await page.goto('/');
  
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
    
    if (bio) {
      const bioInput = page.getByLabel('About You');
      await bioInput.fill(bio);
    }
    
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }
  
  // Wait for home page to fully load with profile info
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Navigate to the profile page using SPA navigation (sidebar click)
 * This preserves the Zustand store state
 */
async function goToProfilePage(page: any) {
  // Use sidebar navigation to preserve store state
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.waitForLoadState('networkidle');
  // Wait for profile page to fully load
  await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
}

test.describe('Profile Page Smoke Tests', () => {
  // Note: createProfile handles registration and data clearing
  // beforeEach is intentionally empty

  test('VAL-PROFILE-001: Edit Profile button shows form with pre-filled values', async ({ page }) => {
    // Create a profile first
    await createProfile(page, 'Stefano', 'A stoic practitioner');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Verify we're in display mode - should see profile info and buttons
    await expect(page.getByText('Stefano')).toBeVisible();
    await expect(page.getByText('A stoic practitioner')).toBeVisible();
    
    // Click Edit Profile button
    const editBtn = page.getByRole('button', { name: 'Edit your profile' });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Should now see the edit form with pre-filled values
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
    
    // Form should have pre-filled name
    const nameInput = page.getByLabel('Name');
    await expect(nameInput).toHaveValue('Stefano');
    
    // Form should have pre-filled bio
    const bioInput = page.getByLabel('About You');
    await expect(bioInput).toHaveValue('A stoic practitioner');
    
    // Should see Save Changes and Cancel buttons
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('VAL-PROFILE-002: Edit form cancel returns to display mode without changes', async ({ page }) => {
    // Create a profile first
    await createProfile(page, 'Stefano', 'Original bio');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Verify initial profile info
    await expect(page.getByText('Stefano')).toBeVisible();
    await expect(page.getByText('Original bio')).toBeVisible();
    
    // Click Edit Profile button
    const editBtn = page.getByRole('button', { name: 'Edit your profile' });
    await editBtn.click();
    
    // Should see the edit form
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
    
    // Change the name
    const nameInput = page.getByLabel('Name');
    await nameInput.fill('Changed Name');
    
    // Change the bio
    const bioInput = page.getByLabel('About You');
    await bioInput.fill('Changed bio');
    
    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Should be back in display mode - original values shown
    await expect(page.getByText('Stefano')).toBeVisible();
    await expect(page.getByText('Original bio')).toBeVisible();
    
    // Should NOT see the edited values
    await expect(page.getByText('Changed Name')).not.toBeVisible();
    await expect(page.getByText('Changed bio')).not.toBeVisible();
    
    // Should see Edit Profile and Reset Profile buttons again
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });

  test('VAL-PROFILE-003: Edit form save persists changes and shows updated profile', async ({ page }) => {
    // Create a profile first
    await createProfile(page, 'Stefano', 'Original bio');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Verify initial profile info
    await expect(page.getByText('Stefano')).toBeVisible();
    await expect(page.getByText('Original bio')).toBeVisible();
    
    // Click Edit Profile button
    const editBtn = page.getByRole('button', { name: 'Edit your profile' });
    await editBtn.click();
    
    // Should see the edit form
    await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
    
    // Change the name
    const nameInput = page.getByLabel('Name');
    await nameInput.fill('Marcus');
    
    // Change the bio
    const bioInput = page.getByLabel('About You');
    await bioInput.fill('Emperor of Rome');
    
    // Click Save Changes
    await page.getByRole('button', { name: 'Save Changes' }).click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Should be back in display mode with updated values - use more specific selectors
    await expect(page.locator('p', { hasText: 'Marcus' })).toBeVisible();
    await expect(page.locator('p', { hasText: 'Emperor of Rome' })).toBeVisible();
    
    // Original values should not be present
    await expect(page.locator('p', { hasText: 'Stefano' })).not.toBeVisible();
    await expect(page.locator('p', { hasText: 'Original bio' })).not.toBeVisible();
    
    // Should see Edit Profile and Reset Profile buttons
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });

  test('VAL-PROFILE-004: Reset Profile clears profile and shows empty profile page', async ({ page }) => {
    // Create a profile first
    await createProfile(page, 'Stefano', 'A stoic practitioner');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Verify profile is visible
    await expect(page.getByText('Stefano')).toBeVisible();
    
    // Click Reset Profile button
    const resetBtn = page.getByRole('button', { name: 'Reset your profile to default' });
    await resetBtn.click();
    
    // Wait for the action to complete
    await page.waitForTimeout(1000);
    
    // Profile should be cleared - name should not be visible
    await expect(page.locator('p', { hasText: 'Stefano' })).not.toBeVisible();
    
    // Profile settings heading should still be visible (empty state)
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
  });

  test('VAL-PROFILE-005: Profile page displays all profile fields', async ({ page }) => {
    // Create a profile with name and bio
    await createProfile(page, 'Test User', 'This is my bio');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Should see profile heading
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    
    // Should see name
    await expect(page.getByText('Test User')).toBeVisible();
    
    // Should see bio
    await expect(page.getByText('This is my bio')).toBeVisible();
    
    // Should see action buttons
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset your profile to default' })).toBeVisible();
  });

  test('profile changes persist after navigation', async ({ page }) => {
    // Create a profile
    await createProfile(page, 'Original Name');
    
    // Navigate to profile page
    await goToProfilePage(page);
    
    // Edit and save changes
    const editBtn = page.getByRole('button', { name: 'Edit your profile' });
    await editBtn.click();
    
    const nameInput = page.getByLabel('Name');
    await nameInput.fill('Persisted Name');
    
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(1000);
    
    // Use sidebar navigation to go to settings (preserves store state)
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    
    // Use sidebar navigation to go back to profile (preserves store state)
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    
    // Updated name should still be visible
    await expect(page.locator('p', { hasText: 'Persisted Name' })).toBeVisible();
  });
});
