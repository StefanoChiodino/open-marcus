import { test, expect, Page } from '@playwright/test';
import { clearTestData, registerTestUser } from './test-db-helpers';

/**
 * Comprehensive History Tests
 * 
 * Tests all history flows:
 * - VAL-HIST-001: Empty history shows empty state
 * - VAL-HIST-002: History list shows past sessions
 * - VAL-HIST-003: Click session navigates to detail
 * - VAL-HIST-004: Session detail shows conversation
 * - VAL-HIST-005: Session detail shows summary
 * - VAL-HIST-006: Back to History navigates correctly
 * - VAL-HIST-007: Invalid session ID shows error
 * - VAL-HIST-008: Direct URL access to session works
 * - VAL-HIST-009: History shows session date and duration
 */

const BACKEND_URL = 'http://localhost:3100';
const FRONTEND_URL = 'http://localhost:3101';

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
 * Helper: Create a profile with the given name and bio
 */
async function createProfile(page: Page, name: string, bio?: string) {
  const token = await registerAndGetToken();

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Clear any persisted session ID before setting new auth token
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
async function goToSessionPage(page: Page) {
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Create a completed meditation session
 * Returns the session ID extracted from the URL
 */
async function createMeditationSession(page: Page): Promise<string> {
  // Start the session
  const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
  await beginBtn.click();

  // Wait for active session
  await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });

  // Wait for Marcus greeting
  await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });

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

  // Extract session ID from URL (format: /history/{sessionId})
  const url = page.url();
  const match = url.match(/\/history\/([^/]+)$/);
  return match ? match[1] : '';
}

/**
 * Helper: Navigate to history page via sidebar
 */
async function goToHistoryPage(page: Page) {
  await page.getByRole('link', { name: 'History' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible({ timeout: 10000 });
}

test.describe('Comprehensive History Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all test data before each test
    await clearTestData();
    // Navigate to app first
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Empty State', () => {
    test('VAL-HIST-001: Empty history shows empty state', async ({ page }) => {
      // Create a profile (user has no sessions yet)
      await createProfile(page, 'History Test User');

      // Navigate to history page
      await goToHistoryPage(page);

      // Should see "No Meditations Yet" heading
      await expect(page.getByRole('heading', { name: 'No Meditations Yet' })).toBeVisible({ timeout: 10000 });

      // Should see descriptive text
      await expect(page.getByText(/No meditations yet\. Begin your first meditation\./)).toBeVisible();

      // Should see "Begin Meditation" link/button to start a session
      await expect(page.getByRole('link', { name: 'Begin Meditation' })).toBeVisible();
    });
  });

  test.describe('Session List', () => {
    test('VAL-HIST-002: History list shows past sessions', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User', 'Testing history');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history page
      await goToHistoryPage(page);

      // Should see "Past Meditations" heading (only shown when sessions exist)
      await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });

      // Should see session history region
      await expect(page.getByRole('region', { name: 'Session History' })).toBeVisible();

      // Should see at least one session in the list
      const sessionItems = page.getByRole('link', { name: /View session from/ });
      await expect(sessionItems.first()).toBeVisible();

      // Session item should show a preview of the first message
      await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    });

    test('VAL-HIST-009: History shows session date and duration', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User', 'Testing history');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history page
      await goToHistoryPage(page);

      // Should see "Past Meditations" heading
      await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });

      // Session link should contain date info (aria-label like "View session from April 7, 2026")
      const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
      await expect(sessionLink).toBeVisible();

      // Should show duration (e.g., "5 min" in the session item)
      await expect(page.getByText(/\d+ min/).first()).toBeVisible();
    });
  });

  test.describe('Session Detail Navigation', () => {
    test('VAL-HIST-003: Click session navigates to detail', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User');
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
    });

    test('VAL-HIST-006: Back to History navigates correctly', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history page
      await goToHistoryPage(page);

      // Click on the first session item
      const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
      await sessionLink.click();

      // Wait for detail page
      await page.waitForURL(/\/history\/[^/]+$/);
      await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });

      // Click "Back to History" link
      await page.getByRole('link', { name: 'Back to History' }).first().click();

      // Should navigate back to history page with session list
      await page.waitForURL('/history');
      await expect(page.getByRole('heading', { name: 'Past Meditations' })).toBeVisible({ timeout: 10000 });

      // Should still see the session in the list
      await expect(page.getByRole('link', { name: /View session from/ })).toBeVisible();
    });

    test('VAL-HIST-008: Direct URL access to session works', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history page to get the session ID from the list
      await goToHistoryPage(page);

      // Get the session link href which contains the session ID
      const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
      const sessionHref = await sessionLink.getAttribute('href');
      expect(sessionHref).toMatch(/\/history\/[^/]+$/);

      // Extract session ID from href
      const sessionId = sessionHref?.match(/\/history\/([^/]+)$/)?.[1];
      expect(sessionId).toBeDefined();

      // Now navigate directly to the session detail URL using page.goto()
      await page.goto(`${FRONTEND_URL}/history/${sessionId}`);
      await page.waitForLoadState('networkidle');

      // Should be on the session detail page (URL matches /history/{sessionId})
      await expect(page).toHaveURL(/\/history\/[^/]+$/);

      // Should see Session Review heading
      await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });

      // Should see "Back to History" button
      await expect(page.getByRole('link', { name: 'Back to History' }).first()).toBeVisible();

      // Should see session metadata (date, duration)
      await expect(page.getByText(/\d+ min/).first()).toBeVisible();
    });
  });

  test.describe('Session Detail Content', () => {
    test('VAL-HIST-004: Session detail shows conversation', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history and click the session
      await goToHistoryPage(page);
      const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
      await sessionLink.click();

      // Wait for detail page
      await page.waitForURL(/\/history\/[^/]+$/);
      await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });

      // Should see the conversation section
      const conversation = page.getByRole('region', { name: 'Session Conversation' });
      await expect(conversation).toBeVisible();

      // The user's message should appear in the conversation
      await expect(page.getByText('How can I practice stoicism daily?')).toBeVisible();
    });

    test('VAL-HIST-005: Session detail shows summary', async ({ page }) => {
      // Create profile and session
      await createProfile(page, 'History Test User');
      await goToSessionPage(page);
      await createMeditationSession(page);

      // Navigate to history and click the session
      await goToHistoryPage(page);
      const sessionLink = page.getByRole('link', { name: /View session from/ }).first();
      await sessionLink.click();

      // Wait for detail page
      await page.waitForURL(/\/history\/[^/]+$/);
      await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });

      // Should see Marcus's Reflection section (summary)
      await expect(page.getByRole('heading', { name: "Marcus's Reflection" })).toBeVisible();

      // Summary should have content (not just empty)
      const reflectionSection = page.locator('.session-detail__summary');
      await expect(reflectionSection).toBeVisible();

      // The reflection content should have actual text
      const reflectionText = await reflectionSection.textContent();
      expect(reflectionText && reflectionText.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('VAL-HIST-007: Invalid session ID shows error', async ({ page }) => {
      // Create profile first
      await createProfile(page, 'History Test User');

      // Navigate directly to an invalid session ID
      await page.goto(`${FRONTEND_URL}/history/invalid-session-id-12345`);
      await page.waitForLoadState('networkidle');

      // Should show error state - the error message appears in an alert div
      // The error displays "Failed to load session: Session not found"
      const errorAlert = page.locator('.session-detail__error');
      await expect(errorAlert).toBeVisible({ timeout: 10000 });

      // Should show "Session not found" in the error message
      await expect(page.getByText(/Session not found/i)).toBeVisible();

      // Should have a way to go back to history
      await expect(page.getByRole('link', { name: 'Back to History' }).first()).toBeVisible();
    });
  });

  test.describe('Multiple Sessions', () => {
    test('Multiple sessions accumulate in history', async ({ page }) => {
      // Create profile
      await createProfile(page, 'History Test User');
      await goToSessionPage(page);

      // Create first session
      await createMeditationSession(page);

      // Start a new session
      await page.getByRole('button', { name: 'Begin a new meditation session' }).click();
      await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });

      // Start second session
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });

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
});
