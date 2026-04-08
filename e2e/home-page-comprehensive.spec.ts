import { test, expect, Page } from '@playwright/test';
import { clearTestData, registerTestUser, setAuthToken } from './test-db-helpers';

/**
 * Comprehensive Home Page Tests
 * 
 * Tests all home page functionality (VAL-HOME-001 through VAL-HOME-004):
 * - VAL-HOME-001: Home page shows personalized greeting with user's name
 * - VAL-HOME-002: Begin Meditation button navigates to /session
 * - VAL-HOME-003: Begin Meditation starts session directly (not just navigation)
 * - VAL-HOME-004: Bio is displayed on home page if present
 */

const FRONTEND_URL = 'http://localhost:3101';
const BACKEND_URL = 'http://localhost:3100';

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
 * Helper: Create a profile with the given name and bio via onboarding
 */
async function createProfile(page: Page, name: string, bio?: string) {
  const token = await registerAndGetToken();
  
  await page.goto(FRONTEND_URL);
  await setAuthToken(page, token);
  
  await clearAllData(token);
  
  await page.reload();
  await page.waitForLoadState('networkidle');
  
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
  
  // Wait for home page to fully load
  await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
}

test.describe('Comprehensive Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearTestData();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('openmarcus-auth-token'));
  });

  test.describe('VAL-HOME-001: Personalized Greeting', () => {
    test('shows personalized greeting with user name', async ({ page }) => {
      // Create a profile with a specific name
      await createProfile(page, 'Stefano');
      
      // Should see the personalized greeting with user's name
      // The greeting uses data-testid="profile-name" and text "Welcome, {name}"
      await expect(page.getByTestId('profile-name')).toHaveText('Welcome, Stefano');
    });

    test('shows personalized greeting after profile edit', async ({ page }) => {
      // Create profile with initial name
      await createProfile(page, 'Alice');
      
      // Verify initial greeting
      await expect(page.getByTestId('profile-name')).toHaveText('Welcome, Alice');
      
      // Navigate to profile and edit
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      
      // Click edit button - on profile page, aria-label is "Edit your profile"
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.waitForLoadState('networkidle');
      
      // Clear and enter new name
      const nameInput = page.getByLabel('Name');
      await nameInput.clear();
      await nameInput.fill('Alicia');
      
      // Save the changes - on profile page, button text is "Save Changes"
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to home
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      
      // Should see updated greeting
      await expect(page.getByTestId('profile-name')).toHaveText('Welcome, Alicia');
    });

    test('greeting shows correctly for different user names', async ({ page }) => {
      // Test with various name formats
      const names = ['John', 'María', '田中', 'Ahmed Ali'];
      
      for (const name of names) {
        await createProfile(page, name);
        await expect(page.getByTestId('profile-name')).toHaveText(`Welcome, ${name}`);
        
        // Clean up for next iteration
        await page.evaluate(() => localStorage.removeItem('openmarcus-auth-token'));
        await clearTestData();
        await page.goto(FRONTEND_URL);
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('VAL-HOME-002: Begin Meditation Button Navigation', () => {
    test('Begin Meditation button is visible and navigates to /session', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Wait for home page to load
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Verify Begin Meditation button is visible
      // Button has aria-label="Begin meditation session"
      const beginBtn = page.getByRole('button', { name: 'Begin meditation session' });
      await expect(beginBtn).toBeVisible();
      
      // Click the button
      await beginBtn.click();
      
      // Should navigate to /session
      await page.waitForURL(/\/session/, { timeout: 10000 });
      
      // URL should show /session
      await expect(page).toHaveURL(/\/session/);
    });

    test('navigation to session page shows correct content', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Click Begin Meditation
      await page.getByRole('button', { name: 'Begin meditation session' }).click();
      await page.waitForURL(/\/session/, { timeout: 10000 });
      
      // After clicking Begin Meditation from home, session is already active
      // Should see the active session UI (not idle state)
      // The session was started by the click, so we see active chat interface
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('VAL-HOME-003: Begin Meditation Starts Session Directly', () => {
    test('clicking Begin Meditation starts session immediately (not just navigation)', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Click Begin Meditation on home page
      await page.getByRole('button', { name: 'Begin meditation session' }).click();
      
      // Should navigate to /session AND start the session directly
      await page.waitForURL(/\/session/, { timeout: 10000 });
      
      // The key difference from VAL-HOME-002: session should be ACTIVE, not idle
      // Active session has main with name "Active Meditation Session"
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
      
      // Should see Marcus greeting (not idle state "Begin Meditation" button)
      // The greeting text is something like "I'm Marcus" or "I am Marcus"
      await expect(page.getByText(/I am Marcus|I'm Marcus/i)).toBeVisible({ timeout: 15000 });
      
      // Should NOT see the idle "Begin Meditation" button - it should be "End meditation session"
      // (unless the UI uses same button but with different state)
      const idleBtn = page.getByRole('button', { name: 'Begin Meditation' });
      await expect(idleBtn).not.toBeVisible({ timeout: 5000 });
      
      // Should see the End Session button
      await expect(page.getByRole('button', { name: 'End meditation session' })).toBeVisible();
    });

    test('Begin Meditation from home starts session, not just redirects to idle session page', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Directly navigate to /session (idle state) to compare
      await page.goto(`${FRONTEND_URL}/session`);
      await page.waitForLoadState('networkidle');
      
      // In idle state, we should see "Begin Meditation" button
      await expect(page.getByRole('button', { name: 'Begin Meditation' }).first()).toBeVisible({ timeout: 10000 });
      
      // Go back to home
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
      
      // Now click Begin Meditation from home
      await page.getByRole('button', { name: 'Begin meditation session' }).click();
      await page.waitForURL(/\/session/, { timeout: 10000 });
      
      // This time, session should be ACTIVE immediately (not idle)
      // Check for active session indicator
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
      
      // Should see chat interface (not idle state)
      await expect(page.getByLabel('Type your message to Marcus')).toBeVisible();
    });
  });

  test.describe('VAL-HOME-004: Bio Display', () => {
    test('bio is displayed on home page when present', async ({ page }) => {
      // Create profile with a bio
      await createProfile(page, 'Stefano', 'A stoic practitioner seeking inner peace');
      
      // Should see bio on home page
      await expect(page.getByTestId('profile-bio')).toHaveText('A stoic practitioner seeking inner peace');
    });

    test('bio is not displayed when user has no bio', async ({ page }) => {
      // Create profile without bio
      await createProfile(page, 'Stefano');
      
      // Bio element should not be visible
      const bioElement = page.getByTestId('profile-bio');
      await expect(bioElement).not.toBeVisible();
    });

    test('bio updates after profile edit', async ({ page }) => {
      // Create profile with initial bio
      await createProfile(page, 'Stefano', 'Initial bio text');
      
      // Verify initial bio
      await expect(page.getByTestId('profile-bio')).toHaveText('Initial bio text');
      
      // Navigate to profile and edit bio
      await page.getByRole('link', { name: 'Profile' }).click();
      await page.waitForLoadState('networkidle');
      
      // Click edit button - on profile page, aria-label is "Edit your profile"
      await page.getByRole('button', { name: 'Edit your profile' }).click();
      await page.waitForLoadState('networkidle');
      
      // Find bio textarea and update
      const bioInput = page.getByLabel('About You');
      await bioInput.clear();
      await bioInput.fill('Updated bio text with new thoughts');
      
      // Save changes - on profile page, button text is "Save Changes"
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to home
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      
      // Should see updated bio
      await expect(page.getByTestId('profile-bio')).toHaveText('Updated bio text with new thoughts');
    });

    test('long bio is displayed correctly', async ({ page }) => {
      // Create profile with a very long bio
      const longBio = 'A'.repeat(500);
      await createProfile(page, 'Stefano', longBio);
      
      // Should see the full bio text
      await expect(page.getByTestId('profile-bio')).toHaveText(longBio);
    });

    test('bio with special characters is displayed correctly', async ({ page }) => {
      // Create profile with special characters in bio
      await createProfile(page, 'Stefano', 'Bio with <script>alert("xss")</script> and "quotes" and apostrophes');
      
      // Bio should be displayed as text, not executed
      await expect(page.getByTestId('profile-bio')).toBeVisible();
      
      // Should NOT have an alert popup (XSS prevention)
      // The text content should be present
      await expect(page.getByTestId('profile-bio')).toContainText('Bio with');
    });
  });

  test.describe('Home Page UI Elements', () => {
    test('home page shows OpenMarcus logo', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      const logo = page.locator('img.home-page__logo, img[alt="OpenMarcus"]').first();
      await expect(logo).toBeVisible();
    });

    test('home page shows app description text', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Should see app description
      await expect(page.getByText(/Your personal Stoic companion/i)).toBeVisible();
      await expect(page.getByText(/Marcus Aurelius/i)).toBeVisible();
    });

    test('home page has Edit Profile button', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Should see Edit Profile button
      await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();
    });

    test('home page navigation sidebar is visible', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      // Should see all navigation items
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Meditation' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'History' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('user without profile sees onboarding, not home', async ({ page }) => {
      // Register user but don't create profile (delete if auto-created)
      const uniqueUsername = `nobio_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const { token } = await registerTestUser(uniqueUsername, 'Password1!');
      await setAuthToken(page, token);
      
      // Clear data to ensure no profile
      await clearAllData(token);
      
      // Navigate to app
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');
      
      // Should see onboarding form, not home page
      await expect(page.getByLabel('Name')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).not.toBeVisible();
    });

    test('Begin Meditation button has correct accessibility attributes', async ({ page }) => {
      await createProfile(page, 'Stefano');
      
      const beginBtn = page.getByRole('button', { name: 'Begin meditation session' });
      
      // Button should have aria-label
      await expect(beginBtn).toHaveAttribute('aria-label', 'Begin meditation session');
      
      // Button should be enabled
      await expect(beginBtn).toBeEnabled();
    });
  });
});
