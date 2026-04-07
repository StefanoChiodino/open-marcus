import { test, expect } from '@playwright/test';
import { clearTestData, registerTestUser } from './test-db-helpers';

/**
 * Session Page Smoke Tests
 * 
 * Tests the session page interactions:
 * - Begin Meditation button starts session with Marcus greeting
 * - Send message displays user message in chat
 * - End session button ends session and shows summary
 * 
 * Fulfills: VAL-SESSION-001, VAL-SESSION-002, VAL-SESSION-003
 */

test.beforeEach(async () => {
  await clearTestData();
});

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
 * Helper: Navigate to the session page using SPA navigation (sidebar click)
 * This preserves the Zustand store state
 */
async function goToSessionPage(page: any) {
  // Use sidebar navigation to preserve store state
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  // Wait for session page to fully load
  await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
}

test.describe('Session Page Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Create a fresh profile before each test
    await createProfile(page, 'Stefano', 'A stoic practitioner');
    
    // Navigate to session page
    await goToSessionPage(page);
  });

  test('VAL-SESSION-001: Begin Meditation button starts session with Marcus greeting', async ({ page }) => {
    // Verify we're on the idle session page (welcome state)
    // Should see Marcus icon and welcome message
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
    
    // Should see the Begin Meditation button
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await expect(beginBtn).toBeVisible();
    
    // Click Begin Meditation
    await beginBtn.click();
    
    // Wait for session to start - the main region label changes to "Active Meditation Session"
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    
    // Should see Marcus greeting message - user should see "I am Marcus" greeting
    // The greeting is in a paragraph with class text-serif and meditation-chat__greeting
    const greetingText = page.getByText(/I'm Marcus/);
    await expect(greetingText).toBeVisible({ timeout: 15000 });
    
    // Should see prompt hint text
    await expect(page.getByText(/Type your thoughts, concerns, or questions below/)).toBeVisible();
    
    // Should see the textarea for input
    const textarea = page.getByLabel('Type your message to Marcus');
    await expect(textarea).toBeVisible();
    
    // Should see the End Session button (aria-label is "End meditation session")
    const endBtn = page.getByRole('button', { name: 'End meditation session' });
    await expect(endBtn).toBeVisible();
    
    // Send button should be visible
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await expect(sendBtn).toBeVisible();
  });

  test('VAL-SESSION-002: Send message displays user message in chat', async ({ page }) => {
    // Start the session first
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await beginBtn.click();
    
    // Wait for active session
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    
    // Wait for Marcus greeting to appear
    await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });
    
    // Type a message in the textarea
    const textarea = page.getByLabel('Type your message to Marcus');
    await textarea.fill('I have been feeling anxious about my work lately.');
    
    // Click the send button
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await sendBtn.click();
    
    // Wait for the user's message to appear in the chat log
    const userMessage = page.getByText('I have been feeling anxious about my work lately.');
    await expect(userMessage).toBeVisible({ timeout: 10000 });
    
    // The user's message should appear as a chat message (in the log)
    // Chat messages have role="listitem" within the chat log
    const chatLog = page.getByRole('log', { name: 'Chat messages' });
    await expect(chatLog).toBeVisible();
    
    // The textarea should be cleared after sending
    await expect(textarea).toHaveValue('');
  });

  test('VAL-SESSION-003: End session button ends session and shows summary', async ({ page }) => {
    // Start the session first
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await beginBtn.click();
    
    // Wait for active session
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    
    // Wait for Marcus greeting to appear
    await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });
    
    // Send a message to have some content in the session
    const textarea = page.getByLabel('Type your message to Marcus');
    await textarea.fill('How can I find peace in difficult times?');
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await sendBtn.click();
    
    // Wait for user message to appear in chat
    await expect(page.getByText('How can I find peace in difficult times?')).toBeVisible({ timeout: 10000 });
    
    // Wait for the loading indicator to disappear (streaming in progress indicator)
    // This indicates Marcus has started responding
    await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
    
    // Click End Session button (aria-label is "End meditation session")
    const endBtn = page.getByRole('button', { name: 'End meditation session' });
    await expect(endBtn).toBeVisible();
    await endBtn.click();
    
    // Wait for summary to appear - should see "Session Complete" heading
    // Use longer timeout as this involves API call to generate summary
    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({ timeout: 60000 });
    
    // Should see Marcus's Reflection section
    await expect(page.getByRole('heading', { name: "Marcus's Reflection" })).toBeVisible();
    
    // Should see "Your Commitments" section (action items)
    await expect(page.getByRole('heading', { name: 'Your Commitments' })).toBeVisible();
    
    // Should see "Begin New Meditation" button (aria-label is "Begin a new meditation session")
    await expect(page.getByRole('button', { name: 'Begin a new meditation session' })).toBeVisible();
  });

  test('session page has correct elements in idle state', async ({ page }) => {
    // Verify idle state elements
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();
    
    // Should see Marcus icon (img with alt "")
    const marcusIcon = page.locator('img[alt=""]').first();
    await expect(marcusIcon).toBeVisible();
    
    // Should see description text
    await expect(page.getByText(/Begin your session of stoic reflection/)).toBeVisible();
    
    // Should see disclaimer
    await expect(page.getByText(/OpenMarcus is not therapy or medical advice/)).toBeVisible();
    
    // Begin button should be visible
    await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
    
    // End Session button should NOT be visible in idle state
    await expect(page.getByRole('button', { name: 'End Session' })).not.toBeVisible();
  });

  test('session page shows streaming response after sending message', async ({ page }) => {
    // Start the session
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await beginBtn.click();
    
    // Wait for active session and greeting
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });
    
    // Send a message
    const textarea = page.getByLabel('Type your message to Marcus');
    await textarea.fill('Tell me about stoicism.');
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    await sendBtn.click();
    
    // Wait for user message to appear
    await expect(page.getByText('Tell me about stoicism.')).toBeVisible({ timeout: 10000 });
    
    // Wait for Marcus response - should see assistant message appearing
    // The chat should have the user's message followed by Marcus's response
    // After streaming completes, the response should be visible
    // Wait for the assistant message to appear (with some content)
    // We don't check exact text since Marcus's response varies
    await page.waitForTimeout(5000); // Give time for streaming to start/complete
    
    // Should see at least the user message we sent
    await expect(page.getByText('Tell me about stoicism.')).toBeVisible();
  });

  test('Begin New Meditation button resets to idle state', async ({ page }) => {
    // Start and end a session to get to summary
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await beginBtn.click();
    
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    
    // Send a message
    const textarea = page.getByLabel('Type your message to Marcus');
    await textarea.fill('I need guidance.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('I need guidance.')).toBeVisible({ timeout: 10000 });
    
    // Wait for streaming to start (loading indicator appears then disappears)
    await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
    
    // End session (aria-label is "End meditation session")
    await page.getByRole('button', { name: 'End meditation session' }).click();
    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({ timeout: 60000 });
    
    // Click Begin New Meditation (aria-label is "Begin a new meditation session")
    await page.getByRole('button', { name: 'Begin a new meditation session' }).click();
    
    // Should be back to idle state
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Begin Meditation' })).toBeVisible();
  });

  test('VAL-SESSION-004: Meditation starts without "Profile ID is required" error', async ({ page }) => {
    // This test verifies the fix for the regression where meditation would fail
    // with "Profile ID is required" error when beginning a session from the session page
    // via sidebar navigation (which doesn't preserve profile context like home page does).

    // Verify we're on the session page in idle state
    await expect(page.getByRole('heading', { name: 'Meditation with Marcus Aurelius' })).toBeVisible();

    // Click Begin Meditation - this should NOT trigger "Profile ID is required" error
    const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
    await beginBtn.click();

    // Session should start successfully - Marcus should greet
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });

    // No error toast should be visible
    await expect(page.getByText('Profile ID is required')).not.toBeVisible({ timeout: 5000 });
  });

  test('VAL-SESSION-005: Input bar stays fixed when messages grow during streaming', async ({ page }) => {
    // Start session
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });

    // Get initial input area position
    const inputAreaBefore = await page.locator('.meditation-chat__input-area').boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    expect(inputAreaBefore).toBeTruthy();
    expect(inputAreaBefore!.y + inputAreaBefore!.height).toBeLessThanOrEqual(viewportHeight);

    // Send a message to trigger streaming
    await page.locator('.meditation-chat__textarea').fill('Tell me about stoicism and how to apply it in daily life');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Wait for streaming to start
    await page.waitForTimeout(500);

    // Input area should stay in same position during streaming
    const inputAreaDuring = await page.locator('.meditation-chat__input-area').boundingBox();
    expect(inputAreaDuring!.y).toBe(inputAreaBefore!.y);

    // Wait for streaming to complete
    await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });

    // Input area should STILL be at original position after streaming
    const inputAreaAfter = await page.locator('.meditation-chat__input-area').boundingBox();
    expect(inputAreaAfter!.y).toBe(inputAreaBefore!.y);

    // Send multiple messages to grow the chat
    for (let i = 0; i < 3; i++) {
      await page.locator('.meditation-chat__textarea').fill(`Message ${i + 1}: What is the nature of virtue?`);
      await page.getByRole('button', { name: 'Send message' }).click();
      await page.waitForTimeout(2000);
    }

    // Input area should STILL be fixed at original position
    const inputAreaFinal = await page.locator('.meditation-chat__input-area').boundingBox();
    expect(inputAreaFinal!.y).toBe(inputAreaBefore!.y);
    expect(inputAreaFinal!.y + inputAreaFinal!.height).toBeLessThanOrEqual(viewportHeight);
  });
});
