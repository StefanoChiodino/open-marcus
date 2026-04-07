import { test, expect } from '@playwright/test';

/**
 * Home Page Smoke Tests
 * 
 * Tests the home page:
 * - Welcome message with user name is displayed
 * - Begin meditation session button is visible and navigates to /session
 * 
 * Fulfills: VAL-HOME-001, VAL-HOME-002
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

test.describe('Home Page Smoke Tests', () => {
  test('VAL-HOME-001: Home page shows personalized greeting with user name', async ({ page }) => {
    // Create a profile with a specific name
    await createProfile(page, 'Stefano', 'A stoic practitioner');
    
    // Wait for home page to load
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    
    // Should see personalized greeting with user's name
    await expect(page.getByText('Welcome, Stefano')).toBeVisible();
    
    // Should see bio if provided
    await expect(page.getByText('A stoic practitioner')).toBeVisible();
    
    // Should see the app description
    await expect(page.getByText(/Your personal Stoic companion, inspired by the wisdom of Marcus Aurelius/)).toBeVisible();
  });

  test('VAL-HOME-002: Begin meditation button navigates to session page', async ({ page }) => {
    // Create a profile first
    await createProfile(page, 'Stefano');
    
    // Wait for home page to load
    await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible({ timeout: 10000 });
    
    // Verify Begin meditation button is visible
    const beginBtn = page.getByRole('button', { name: 'Begin meditation session' });
    await expect(beginBtn).toBeVisible();
    
    // Click the button
    await beginBtn.click();
    
    // Should navigate to /session
    await page.waitForURL('**/session');
    
    // Session page should show Marcus greeting
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
    
    // Should see Begin Meditation button (to start the actual session)
    await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
  });
});
