import { test, expect } from '@playwright/test';

/**
 * History Page Smoke Tests
 * 
 * Tests the history page:
 * - History page shows list of past sessions
 * - Clicking a session navigates to session detail
 * 
 * Fulfills: VAL-HISTORY-001, VAL-HISTORY-002
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
  
  // Clear any persisted session ID before setting new auth token
  // This prevents restoring a stale session from a previous test run
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-active-session-id');
  });
  
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
 * Helper: Navigate to the session page using sidebar link
 */
async function goToSessionPage(page: any) {
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Create a completed meditation session
 * Returns the session URL path for potential navigation
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
  
  // Wait for Marcus response to complete (loading indicator disappears)
  await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
  
  // End the session
  const endBtn = page.getByRole('button', { name: 'End meditation session' });
  await endBtn.click();
  
  // Wait for summary
  await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({ timeout: 60000 });
  
  // Return the session URL for later navigation
  return page.url();
}

/**
 * Helper: Navigate to history page via sidebar
 */
async function goToHistoryPage(page: any) {
  await page.getByRole('link', { name: 'History' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible({ timeout: 10000 });
}

test.describe('History Page Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh profile before each test
    await createProfile(page, 'History Test User', 'Testing history');
  });

  test('VAL-HISTORY-001: History page shows session list with past meditations', async ({ page }) => {
    // Navigate to session page and create a session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Navigate to history page
    await goToHistoryPage(page);
    
    // Should see "Past Meditations" heading (only shown when sessions exist)
    await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });
    
    // Should see session history region
    await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible();
    
    // Should see at least one session in the list
    // Sessions are in a list with role="list" (inside the region)
    const sessionList = page.locator('.session-history__list');
    await expect(sessionList).toBeVisible();
    
    // Should see session item(s) with date/duration info
    // Each session item is a Link with aria-label like "View session from..."
    const sessionItems = page.getByRole('link', { name: /View session from/ });
    await expect(sessionItems.first()).toBeVisible();
    
    // Session item should show a preview of the first message
    const preview = page.getByText('How can I practice stoicism daily?');
    await expect(preview).toBeVisible();
  });

  test('VAL-HISTORY-002: Clicking session navigates to session detail', async ({ page }) => {
    // Navigate to session page and create a session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Navigate to history page
    await goToHistoryPage(page);
    
    // Should see "Past Meditations" heading
    await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });
    
    // Click on the first session item
    const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
    await sessionLink.click();
    
    // Wait for navigation to session detail page
    await page.waitForURL(/\/history\/[^/]+$/);
    
    // Should see Session Detail page with "Session Review" heading
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Should see "Back to History" button
    await expect(page.getByRole('link', { name: 'Back to History' }).first()).toBeVisible();
    
    // Should see session metadata (date, duration, status)
    await expect(page.getByText(/\d+ min/).first()).toBeVisible();
    
    // Should see Marcus's Reflection section (summary)
    await expect(page.getByRole('heading', { name: "Marcus's Reflection" })).toBeVisible();
    
    // Should see the conversation with messages
    const conversation = page.getByRole('region', { name: 'Session Conversation' });
    await expect(conversation).toBeVisible();
    
    // The user's message should appear in the conversation
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
  });

  test('History page shows empty state when no sessions exist', async ({ page }) => {
    // Navigate directly to history page without creating any sessions
    await goToHistoryPage(page);
    
    // Should see empty state with "No Meditations Yet" heading
    await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible({ timeout: 10000 });
    
    // Should see descriptive text
    await expect(page.getByText(/No meditations yet\. Begin your first meditation\./)).toBeVisible();
    
    // Should see "Begin Meditation" button to start a session
    await expect(page.getByRole('link', { name: 'Begin Meditation' })).toBeVisible();
  });

  test('Back to History button on detail page works', async ({ page }) => {
    // Create a session and navigate to its detail
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Go to history and click the session
    await goToHistoryPage(page);
    await page.getByRole('link', { name: /View session from/ }).first().click();
    
    // Wait for detail page
    await page.waitForURL(/\/history\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Click "Back to History" link
    await page.getByRole('link', { name: 'Back to History' }).first().click();
    
    // Should navigate back to history page with session list
    await page.waitForURL('/history');
    await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });
  });

  test('Session detail displays session conversation', async ({ page }) => {
    // Create a session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Navigate to history and click the session
    await goToHistoryPage(page);
    await page.getByRole('link', { name: /View session from/ }).first().click();
    
    // Wait for detail page
    await page.waitForURL(/\/history\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
    
    // Should see the conversation section with user's message
    const conversation = page.getByRole('region', { name: 'Session Conversation' });
    await expect(conversation).toBeVisible();
    
    // The user's message should appear in the conversation
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    
    // Marcus's Reflection section may or may not have content
    // (depends on whether Marcus generated a summary)
    const reflectionSection = page.locator('.session-detail__summary');
    const hasReflection = await reflectionSection.isVisible().catch(() => false);
    if (hasReflection) {
      await expect(page.getByRole('heading', { name: "Marcus's Reflection" })).toBeVisible();
    }
    
    // Action items section only appears if Marcus generated commitments
    // (This is conditional based on session content)
  });

  test('Multiple sessions appear in history list', async ({ page }) => {
    // Create first session
    await goToSessionPage(page);
    await createMeditationSession(page);
    
    // Create second session - first click "Begin a new meditation session" to reset
    await page.getByRole('button', { name: 'Begin a new meditation session' }).click();
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
    
    // Start second session
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/I am Marcus/)).toBeVisible({ timeout: 15000 });
    
    const textarea = page.getByLabel('Type your message to Marcus');
    await textarea.fill('What is the nature of virtue?');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('What is the nature of virtue?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
    
    await page.getByRole('button', { name: 'End meditation session' }).click();
    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({ timeout: 60000 });
    
    // Go to history - should see both sessions
    await goToHistoryPage(page);
    
    // Should see both sessions listed
    const sessionLinks = page.getByRole('link', { name: /View session from/ });
    await expect(sessionLinks).toHaveCount(2);
    
    // Both message previews should be visible
    await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    await expect(page.getByText('What is the nature of virtue?')).toBeVisible();
  });
});
