import { test, expect } from '@playwright/test';
import {
  setAuthToken,
  clearAuthToken,
} from './test-db-helpers';

/**
 * Comprehensive Profile Tests
 * 
 * Tests all profile flows:
 * - VAL-PROFILE-001: Profile page displays name and bio
 * - VAL-PROFILE-002: Edit profile shows pre-filled form
 * - VAL-PROFILE-003: Edit with empty name shows validation error
 * - VAL-PROFILE-004: Cancel edit returns to display mode
 * - VAL-PROFILE-005: Save edit persists changes
 * - VAL-PROFILE-006: Profile changes reflect on home page greeting
 * - VAL-PROFILE-007: Profile persists across logout/login cycle
 */

const FRONTEND_URL = 'http://localhost:3101';
const BACKEND_URL = 'http://localhost:3100';

/**
 * Helper: Register a test user and get auth token
 */
async function registerAndGetToken(): Promise<string> {
  const testUsername = `profile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUsername, password: 'testpassword123' }),
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
 * Helper: Create a profile with the given name and bio via UI onboarding
 */
async function createProfile(page: any, name: string, bio?: string) {
  // First, register and get token
  const token = await registerAndGetToken();
  
  // Navigate to app
  await page.goto(`${FRONTEND_URL}/`);
  
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
}

/**
 * Helper: Navigate to profile page and wait for it to load
 */
async function goToProfilePage(page: any) {
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Navigate to home page and wait for it to load
 */
async function goToHomePage(page: any) {
  await page.getByRole('link', { name: 'Home' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
}

test.describe('Comprehensive Profile Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and clear auth
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await clearAuthToken(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test.describe('VAL-PROFILE-001: Profile page displays name and bio', () => {
    test('Profile page shows user name and bio from creation', async ({ page }) => {
      // Create profile via UI onboarding
      await createProfile(page, 'Stefano', 'A stoic practitioner');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Should see profile heading
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
      
      // Should see name displayed (using partial text match)
      await expect(page.getByText('Stefano')).toBeVisible();
      
      // Should see bio displayed
      await expect(page.getByText('A stoic practitioner')).toBeVisible();
      
      // Should see Edit Profile button
      await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    });

    test('Profile page with no bio shows name only', async ({ page }) => {
      // Create profile with no bio - use unique name to avoid conflicts
      await createProfile(page, 'ProfileUserNoBio', '');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Should see name
      await expect(page.getByText('Name: ProfileUserNoBio')).toBeVisible();
      
      // Should see Edit Profile button
      await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    });
  });

  test.describe('VAL-PROFILE-002: Edit profile shows pre-filled form', () => {
    test('Clicking Edit Profile shows form with current name and bio pre-filled', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Stefano', 'Original bio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Verify display mode shows original values
      await expect(page.getByText('Stefano')).toBeVisible();
      await expect(page.getByText('Original bio')).toBeVisible();
      
      // Click Edit Profile button
      const editBtn = page.getByRole('button', { name: 'Edit your profile' });
      await editBtn.click();
      
      // Should see edit form heading
      await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
      
      // Form should have pre-filled name
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toHaveValue('Stefano');
      
      // Form should have pre-filled bio
      const bioInput = page.getByLabel('About You');
      await expect(bioInput).toHaveValue('Original bio');
      
      // Should see Save Changes and Cancel buttons
      await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('Edit form pre-fills even with empty bio', async ({ page }) => {
      // Create profile with empty bio
      await createProfile(page, 'EmptyBioUser', '');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Form should have pre-filled name
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toHaveValue('EmptyBioUser');
      
      // Bio input should be empty
      const bioInput = page.getByLabel('About You');
      await expect(bioInput).toHaveValue('');
    });
  });

  test.describe('VAL-PROFILE-003: Edit with empty name shows validation error', () => {
    test('Clearing name field and saving shows validation error', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Stefano', 'A stoic practitioner');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Clear the name field
      const nameInput = page.getByLabel('Name');
      await nameInput.clear();
      
      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();
      
      // Should see validation error
      const errorMessage = page.getByText('Name is required');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Should still be on edit form (not saved)
      await expect(page.getByRole('heading', { name: 'Edit Profile' })).toBeVisible();
      await expect(nameInput).toHaveValue('');
    });

    test('Whitespace-only name shows validation error', async ({ page }) => {
      // Create profile
      await createProfile(page, 'WhitespaceTest', 'Bio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Enter whitespace-only name
      const nameInput = page.getByLabel('Name');
      await nameInput.fill('   ');
      
      // Try to save
      await page.getByRole('button', { name: 'Save Changes' }).click();
      
      // Should see validation error
      const errorMessage = page.getByText('Name is required');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('Validation error has proper aria attributes for accessibility', async ({ page }) => {
      // Create profile
      await createProfile(page, 'AriaTest', 'Bio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Clear name and try to save
      const nameInput = page.getByLabel('Name');
      await nameInput.clear();
      await page.getByRole('button', { name: 'Save Changes' }).click();
      
      // Error should have role="alert" for screen readers
      const errorSpan = page.locator('#name-error');
      await expect(errorSpan).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('VAL-PROFILE-004: Cancel edit returns to display mode', () => {
    test('Cancel returns to profile display without saving changes', async ({ page }) => {
      // Create profile with known values - use unique names
      await createProfile(page, 'OriginalName', 'OriginalBio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Verify original values are displayed (use unique text to avoid conflicts)
      await expect(page.getByText('Name: OriginalName')).toBeVisible();
      await expect(page.getByText('Bio: OriginalBio')).toBeVisible();
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Change the values
      const nameInput = page.getByLabel('Name');
      const bioInput = page.getByLabel('About You');
      await nameInput.fill('ChangedName');
      await bioInput.fill('ChangedBio');
      
      // Click Cancel
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Should be back in display mode with ORIGINAL values
      await expect(page.getByText('Name: OriginalName')).toBeVisible();
      await expect(page.getByText('Bio: OriginalBio')).toBeVisible();
      
      // Should NOT see the changed values
      await expect(page.getByText('ChangedName')).not.toBeVisible();
      await expect(page.getByText('ChangedBio')).not.toBeVisible();
      
      // Should see Edit Profile button again
      await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
    });

    test('Cancel discards all unsaved changes', async ({ page }) => {
      // Create profile
      await createProfile(page, 'CancelTest', 'CancelBio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Edit profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('Name').fill('Edited');
      await page.getByLabel('About You').fill('EditedBio');
      
      // Cancel without making any actual saves
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Verify original profile is still displayed
      await expect(page.getByText('Name: CancelTest')).toBeVisible();
      await expect(page.getByText('Bio: CancelBio')).toBeVisible();
    });
  });

  test.describe('VAL-PROFILE-005: Save edit persists changes', () => {
    test('Saving edit persists new name/bio and displays on profile page', async ({ page }) => {
      // Create profile
      await createProfile(page, 'OldName', 'OldBio');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Click Edit Profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Change the values
      await page.getByLabel('Name').fill('NewName');
      await page.getByLabel('About You').fill('NewBio');
      
      // Save Changes
      await page.getByRole('button', { name: 'Save Changes' }).click();
      
      // Wait for save to complete and navigate back to display mode
      await page.waitForTimeout(1000);
      
      // Should see updated values in display mode
      await expect(page.getByText('Name: NewName')).toBeVisible();
      await expect(page.getByText('Bio: NewBio')).toBeVisible();
      
      // Should NOT see old values
      await expect(page.getByText('OldName')).not.toBeVisible();
      await expect(page.getByText('OldBio')).not.toBeVisible();
    });

    test('Saved changes persist after page reload', async ({ page }) => {
      // Create profile
      await createProfile(page, 'ReloadTest', 'ReloadBio');
      
      // Navigate to profile page and edit
      await goToProfilePage(page);
      
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('Name').fill('PersistedName');
      await page.getByLabel('About You').fill('PersistedBio');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(1000);
      
      // Verify changes are saved
      await expect(page.getByText('Name: PersistedName')).toBeVisible();
      
      // Reload the page - need to navigate to home first then to profile
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Navigate to profile page
      await goToProfilePage(page);
      
      // Updated values should persist
      await expect(page.getByText('Name: PersistedName')).toBeVisible();
      await expect(page.getByText('Bio: PersistedBio')).toBeVisible();
    });

    test('Profile changes persist after navigating away and back', async ({ page }) => {
      // Create profile
      await createProfile(page, 'NavTest', 'NavBio');
      
      // Navigate to profile page and edit
      await goToProfilePage(page);
      
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('Name').fill('NavUpdated');
      await page.getByLabel('About You').fill('NavUpdatedBio');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(1000);
      
      // Navigate to settings page
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      
      // Navigate back to profile
      await goToProfilePage(page);
      
      // Updated values should still be there
      await expect(page.getByText('Name: NavUpdated')).toBeVisible();
      await expect(page.getByText('Bio: NavUpdatedBio')).toBeVisible();
    });
  });

  test.describe('VAL-PROFILE-006: Profile changes reflect on home page greeting', () => {
    test('After editing profile name, home page greeting shows new name immediately', async ({ page }) => {
      // Create profile
      await createProfile(page, 'InitialName', 'My bio');
      
      // Navigate to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Check initial greeting shows initial name (contains "Welcome, InitialName")
      await expect(page.getByTestId('profile-name')).toContainText('InitialName');
      
      // Edit profile name
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('Name').fill('UpdatedName');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(1000);
      
      // Navigate to home
      await goToHomePage(page);
      
      // Home greeting should show updated name (contains "Welcome, UpdatedName")
      await expect(page.getByTestId('profile-name')).toContainText('UpdatedName');
    });

    test('Home page greeting updates without requiring page reload', async ({ page }) => {
      // Create profile
      await createProfile(page, 'HomeTest', 'Bio');
      
      // Navigate to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Navigate to profile
      await goToProfilePage(page);
      
      // Edit profile
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('Name').fill('HomeUpdated');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(1000);
      
      // Navigate to home using sidebar (preserves state)
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      
      // Should see updated greeting immediately (contains "Welcome, HomeUpdated")
      await expect(page.getByTestId('profile-name')).toContainText('HomeUpdated');
    });

    test('Bio changes are reflected on home page', async ({ page }) => {
      // Create profile with bio
      await createProfile(page, 'BioUser', 'Initial bio content');
      
      // Navigate to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Edit bio
      await goToProfilePage(page);
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.getByLabel('About You').fill('Updated bio content');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForTimeout(1000);
      
      // Navigate to home
      await goToHomePage(page);
      
      // Bio should be displayed on home page
      await expect(page.getByText('Updated bio content')).toBeVisible();
    });
  });

  test.describe('VAL-PROFILE-007: Profile persists across logout/login cycle', () => {
    test('Profile name and bio persist through complete logout/login flow', async ({ page }) => {
      // Register a new user and get token
      const testUsername = `persist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: 'testpassword123' }),
      });

      if (!registerResponse.ok) {
        throw new Error(`Failed to register: ${registerResponse.status}`);
      }

      const { token } = await registerResponse.json();
      
      // Set token and navigate to app
      await setAuthToken(page, token);
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Clear any existing data and create profile via onboarding UI
      await clearAllData(token);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Fill in onboarding form
      const nameInput = page.getByLabel('Name');
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('FullFlowUser');
        await page.getByLabel('About You').fill('FullFlowBio');
        await page.getByRole('button', { name: 'Begin Journey' }).click();
        await page.waitForLoadState('networkidle');
      }
      
      // Verify profile greeting
      await expect(page.getByTestId('profile-name')).toContainText('FullFlowUser');
      
      // Logout via UI
      await page.getByRole('button', { name: /Log out/i }).click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      
      // Clear token to simulate fresh browser
      await clearAuthToken(page);
      
      // Now login again with same credentials
      await page.getByLabel('Username').fill(testUsername);
      await page.getByLabel('Password').fill('testpassword123');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for redirect to home
      await page.waitForURL(/\/$/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Profile name should persist (contains "Welcome, FullFlowUser")
      await expect(page.getByTestId('profile-name')).toContainText('FullFlowUser');
      
      // Navigate to profile to verify full data
      await goToProfilePage(page);
      await expect(page.getByText('FullFlowUser')).toBeVisible();
      await expect(page.getByText('FullFlowBio')).toBeVisible();
    });
  });

  test.describe('Profile Page UI Elements', () => {
    test('Profile page shows Profile Settings heading', async ({ page }) => {
      await createProfile(page, 'UIUser', 'UIBio');
      
      await goToProfilePage(page);
      
      await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible();
    });

    test('Edit Profile button has correct accessible label', async ({ page }) => {
      await createProfile(page, 'AccessibleUser', 'AccessibleBio');
      
      await goToProfilePage(page);
      
      // Button should be accessible
      const editBtn = page.getByRole('button', { name: 'Edit your profile' });
      await expect(editBtn).toBeVisible();
      await expect(editBtn).toBeEnabled();
    });

    test('Profile form has proper labels for accessibility', async ({ page }) => {
      await createProfile(page, 'FormLabelsUser', 'Bio');
      
      await goToProfilePage(page);
      
      // Click edit
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      
      // Name input should have proper label
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveAttribute('type', 'text');
      
      // Bio textarea should have proper label
      const bioInput = page.getByLabel('About You');
      await expect(bioInput).toBeVisible();
    });
  });
});
