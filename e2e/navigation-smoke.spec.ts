import { test, expect } from '@playwright/test';

/**
 * Navigation Smoke Tests
 * 
 * Tests all sidebar navigation links:
 * - Each sidebar link navigates to correct page
 * - All pages load without console errors
 * - Active page is highlighted in sidebar
 * 
 * Fulfills: VAL-NAV-001, VAL-NAV-002, VAL-NAV-003, VAL-NAV-004, VAL-NAV-005
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

test.describe('Navigation Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh profile before each test
    await createProfile(page, 'Navigation Test User', 'Testing navigation');
  });

  test('VAL-NAV-001: Sidebar Home link navigates to home page', async ({ page }) => {
    // First navigate away from home using sidebar
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
    
    // Click Home in sidebar
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForLoadState('networkidle');
    
    // Should see welcome message (h3 on home page)
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    
    // Should see begin meditation button
    await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
  });

  test('VAL-NAV-002: Sidebar Meditation link navigates to session page', async ({ page }) => {
    // Click Meditation in sidebar
    await page.getByRole('link', { name: 'Meditation' }).click();
    await page.waitForLoadState('networkidle');
    
    // Should see session page elements - main region has aria-label "Meditation Session"
    await expect(page.getByRole('main', { name: 'Meditation Session' })).toBeVisible({ timeout: 10000 });
    
    // Should see the Meditation with Marcus Aurelius heading
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
    
    // Should see Begin Meditation button
    await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
  });

  test('VAL-NAV-003: Sidebar History link navigates to history page', async ({ page }) => {
    // Click History in sidebar
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForLoadState('networkidle');
    
    // Should see history page elements - main region has aria-label "Session History"
    await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible({ timeout: 10000 });
    
    // Should see Past Meditations heading (empty state when no sessions)
    await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible();
  });

  test('VAL-NAV-004: Sidebar Profile link navigates to profile page', async ({ page }) => {
    // Click Profile in sidebar
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    
    // Should see profile page elements
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Edit your profile' })).toBeVisible();
  });

  test('VAL-NAV-005: Sidebar Settings link navigates to settings page', async ({ page }) => {
    // Click Settings in sidebar
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Should see settings page elements
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
  });

  test('active page is highlighted in sidebar', async ({ page }) => {
    // Navigate to each page and verify the active state
    
    // Home should be active initially
    let homeLink = page.getByRole('link', { name: 'Home' });
    await expect(homeLink).toHaveClass(/navigation__link--active/);
    
    // Navigate to Meditation
    await page.getByRole('link', { name: 'Meditation' }).click();
    await page.waitForLoadState('networkidle');
    
    // Meditation link should now be active, Home should not
    let meditationLink = page.getByRole('link', { name: 'Meditation' });
    await expect(meditationLink).toHaveClass(/navigation__link--active/);
    homeLink = page.getByRole('link', { name: 'Home' });
    await expect(homeLink).not.toHaveClass(/navigation__link--active/);
    
    // Navigate to History
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForLoadState('networkidle');
    
    // History link should now be active
    let historyLink = page.getByRole('link', { name: 'History' });
    await expect(historyLink).toHaveClass(/navigation__link--active/);
    
    // Navigate to Profile
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    
    // Profile link should now be active
    let profileLink = page.getByRole('link', { name: 'Profile' });
    await expect(profileLink).toHaveClass(/navigation__link--active/);
    
    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    
    // Settings link should now be active
    let settingsLink = page.getByRole('link', { name: 'Settings' });
    await expect(settingsLink).toHaveClass(/navigation__link--active/);
  });

  test('all pages load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to Home first
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    
    // Navigate to Meditation
    await page.getByRole('link', { name: 'Meditation' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
    
    // Navigate to History
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForLoadState('networkidle');
    // In empty state, heading is "No Meditations Yet"
    await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible({ timeout: 10000 });
    
    // Navigate to Profile
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
    
    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    
    // No console errors should have occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('can navigate through all pages and return home', async ({ page }) => {
    // Start at home
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    
    // Go to Meditation
    await page.getByRole('link', { name: 'Meditation' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
    
    // Go to History
    await page.getByRole('link', { name: 'History' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible({ timeout: 10000 });
    
    // Go to Profile
    await page.getByRole('link', { name: 'Profile' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible({ timeout: 10000 });
    
    // Go to Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    
    // Return to Home
    await page.getByRole('link', { name: 'Home' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Begin meditation session' })).toBeVisible();
  });
});
