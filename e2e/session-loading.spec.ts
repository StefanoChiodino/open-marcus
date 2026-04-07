import { test, expect } from '@playwright/test';

/**
 * Session Loading E2E Tests
 * 
 * These tests verify that sessions can be loaded correctly via direct URL
 * access, ensuring user isolation and proper error handling for invalid sessions.
 * 
 * CRITICAL: These tests do NOT use clearAllData() to ensure they test
 * real-world scenarios where users navigate with existing data.
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
 * Helper: Create a profile with the given name and bio
 * NOTE: This does NOT clear data - tests should run with existing data
 */
async function createProfile(page: any, name: string, bio?: string) {
  const token = await registerAndGetToken();
  
  await page.goto('/');
  
  // Clear any persisted session ID before setting new auth token
  // This prevents restoring a stale session from a previous test run
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-active-session-id');
  });
  
  // Store token in localStorage for API calls
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);
  
  // Reload to apply the new auth token
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
 * Helper: Navigate to the session page using sidebar link
 */
async function goToSessionPage(page: any) {
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Create a completed meditation session
 * Returns the session ID from the URL
 */
async function createMeditationSession(page: any): Promise<string> {
  // Start the session
  const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
  await beginBtn.click();
  
  // Wait for active session
  await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
  
  // Wait for Marcus greeting
  await expect(page.getByText(/I am Marcus/)).toBeVisible({ timeout: 15000 });
  
  // Send a message
  const textarea = page.getByLabel('Type your message to Marcus');
  await textarea.fill('How can I practice stoicism daily?');
  
  const sendBtn = page.getByRole('button', { name: 'Send message' });
  await sendBtn.click();
  
  // Wait for user message to appear
  await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible({ timeout: 10000 });
  
  // Wait for Marcus response to complete
  await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
  
  // End the session
  const endBtn = page.getByRole('button', { name: 'End meditation session' });
  await endBtn.click();
  
  // Wait for summary
  await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({ timeout: 60000 });
  
  // Extract session ID from URL
  const url = page.url();
  const sessionId = url.split('/history/')[1];
  return sessionId;
}

/**
 * Helper: Navigate to history page via sidebar
 */
async function goToHistoryPage(page: any) {
  await page.getByRole('link', { name: 'History' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible({ timeout: 10000 });
}

test.describe('Session Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh profile before each test
    await createProfile(page, 'Session Loading User', 'Testing session loading');
  });

  test('Direct URL access to session detail loads session', async ({ page }) => {
    // Create a meditation session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // After session completes, we're on /session page, not /history/{id}
    // We need to navigate to history to get the session ID
    await goToHistoryPage(page);
    
    // Get the session link to extract session ID
    const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
    const href = await sessionLink.getAttribute('href');
    const sessionId = href?.split('/history/')[1];
    
    if (!sessionId) {
      throw new Error(`Could not extract session ID from href: ${href}`);
    }
    
    // Navigate DIRECTLY to /history/{sessionId} via URL - not via UI
    await page.goto(`/history/${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for React to fully render
    await page.waitForTimeout(1000);
    
    // Check for error states - "Session not found" means user isolation bug
    const hasSessionNotFound = await page.getByText('Session not found').isVisible().catch(() => false);
    if (hasSessionNotFound) {
      throw new Error(`Session not found for sessionId: ${sessionId} at URL: ${page.url()}`);
    }
    
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Should see the conversation content
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    
    // Should see Marcus's Reflection section
    await expect(page.getByRole('heading', { name: "Marcus's Reflection" })).toBeVisible();
    
    // Should see session metadata
    await expect(page.getByText(/\d+ min/).first()).toBeVisible();
  });

  test('Invalid session ID shows error message', async ({ page }) => {
    // Navigate to history page with an invalid session ID
    await page.goto('/history/invalid-session-id-12345');
    
    // Should show clear error: "Session not found"
    await expect(page.getByText('Session not found')).toBeVisible({ timeout: 10000 });
    
    // Should NOT crash or show blank page - should still have navigation
    await expect(page.getByRole('link', { name: 'History', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meditation', exact: true })).toBeVisible();
    
    // Should have a way to go back to history
    await expect(page.getByRole('link', { name: 'Back to History' }).first()).toBeVisible();
  });

  test('Non-existent session ID shows error', async ({ page }) => {
    // Navigate to a session ID that exists but belongs to another user
    // or was never created
    await page.goto('/history/00000000-0000-0000-0000-000000000000');
    
    // Should show error state
    await expect(page.getByText('Session not found')).toBeVisible({ timeout: 10000 });
    
    // Should still be on a valid page with navigation available
    await expect(page.getByRole('link', { name: 'History', exact: true })).toBeVisible();
  });

  test('Session created in meditation appears in history', async ({ page }) => {
    // Create a meditation session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Go to history page
    await goToHistoryPage(page);
    
    // Session should be visible in the list
    await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });
    
    // Should see the session in the list
    await expect(page.getByRole('link', { name: /View session from/ })).toBeVisible();
    
    // Should see the message preview
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
  });

  test('Clicking session in history navigates to detail', async ({ page }) => {
    // Create a session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Navigate to history
    await goToHistoryPage(page);
    
    // Click on the session
    const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
    await sessionLink.click();
    
    // Wait for navigation to session detail page
    await page.waitForURL(/\/history\/[^/]+$/);
    
    // Should see Session Review heading
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Should see the conversation
    await expect(page.getByRole('region', { name: 'Session Conversation' })).toBeVisible();
    
    // Should see user's message in conversation
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
  });

  test('Session detail shows conversation content', async ({ page }) => {
    // Create a session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Go to history page to get session ID properly
    await goToHistoryPage(page);
    
    // Get session link to extract ID
    const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
    const href = await sessionLink.getAttribute('href');
    const sessionId = href?.split('/history/')[1];
    
    if (!sessionId) {
      throw new Error(`Could not extract session ID from href: ${href}`);
    }
    
    // Navigate directly to session detail via URL
    await page.goto(`/history/${sessionId}`);
    await page.waitForLoadState('networkidle');
    
    // Should see Session Review heading
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Should see session conversation region
    const conversation = page.getByRole('region', { name: 'Session Conversation' });
    await expect(conversation).toBeVisible();
    
    // User's message should appear in the conversation
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    
    // Should see Back to History link
    await expect(page.getByRole('link', { name: 'Back to History' }).first()).toBeVisible();
  });

  test('Session URL with valid UUID format but non-existent session shows error', async ({ page }) => {
    // Use a UUID format that is valid but doesn't correspond to any session
    await page.goto('/history/12345678-1234-1234-1234-123456789012');
    
    // Should show appropriate error
    await expect(page.getByText('Session not found')).toBeVisible({ timeout: 10000 });
    
    // Page should still be functional with navigation
    await expect(page.getByRole('link', { name: 'Meditation', exact: true })).toBeVisible();
  });
});
