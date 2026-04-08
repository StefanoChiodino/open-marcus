import { test, expect } from '@playwright/test';
import { clearTestData, setAuthToken } from './test-db-helpers';

/**
 * Chat Input Box E2E Tests
 * 
 * Tests the auto-expanding textarea behavior:
 * 1. Single line input stays at default size
 * 2. Multi-line input (Shift+Enter) expands the textarea
 * 3. Textarea expands only up to a maximum height
 * 4. Scrollbar appears when content exceeds the maximum height
 * 
 * These tests document the expected behavior for the chat input box.
 * Some tests may fail if the auto-expand functionality is not yet implemented.
 * 
 * Fulfills: VAL-CHAT-INPUT-001 through VAL-CHAT-INPUT-010
 */

const BACKEND_URL = 'http://localhost:3100';

/**
 * Helper: Create a fresh profile and navigate to session page
 */
async function setupSessionPage(page: any): Promise<void> {
  await clearTestData();
  
  // Register test user
  const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `chat_input_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      password: 'TestPassword123!'
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Registration failed: ${response.status}`);
  }
  
  const { token } = await response.json();
  
  // Navigate to app and set token
  await page.goto('/');
  await setAuthToken(page, token);
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Check if we're on onboarding
  const nameInput = page.getByLabel('Name');
  const isOnboarding = await nameInput.isVisible().catch(() => false);
  
  if (isOnboarding) {
    await nameInput.fill('Chat Tester');
    await page.getByRole('button', { name: 'Begin Journey' }).click();
    await page.waitForLoadState('networkidle');
  }
  
  // Navigate to session page
  await page.getByRole('link', { name: 'Meditation' }).click();
  await page.waitForLoadState('networkidle');
  
  // Start the session
  const beginBtn = page.getByRole('button', { name: 'Begin Meditation' });
  await expect(beginBtn).toBeVisible();
  await beginBtn.click();
  
  // Wait for active session
  await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible({ timeout: 15000 });
  
  // Wait for Marcus greeting
  await expect(page.getByText(/I'm Marcus/)).toBeVisible({ timeout: 15000 });
}

/**
 * Helper: Get the computed height of the textarea
 */
async function getTextareaHeight(page: any): Promise<number> {
  return await page.evaluate(() => {
    const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
    return textarea ? textarea.offsetHeight : 0;
  });
}

/**
 * Helper: Get the scroll height of the textarea (total content height)
 */
async function getTextareaScrollHeight(page: any): Promise<number> {
  return await page.evaluate(() => {
    const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
    return textarea ? textarea.scrollHeight : 0;
  });
}

/**
 * Helper: Check if textarea has overflow (scrollbar capability)
 */
async function hasTextareaOverflow(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
    if (!textarea) return false;
    return textarea.scrollHeight > textarea.clientHeight;
  });
}

/**
 * Helper: Get the CSS max-height value of the textarea
 */
async function getTextareaMaxHeight(page: any): Promise<number> {
  return await page.evaluate(() => {
    const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
    if (!textarea) return 0;
    const style = window.getComputedStyle(textarea);
    return parseFloat(style.maxHeight) || 200; // Default max-height if not set
  });
}

/**
 * Helper: Type text into textarea, pressing Shift+Enter between lines
 */
async function typeMultiLineText(_page: any, textarea: any, lines: string[]): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      await textarea.press('Shift+Enter');
    }
    await textarea.type(lines[i]);
  }
}

test.describe('Chat Input Box Auto-Expand Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupSessionPage(page);
  });

  test('VAL-CHAT-INPUT-001: Single line input stays at default height', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    await expect(textarea).toBeVisible();
    
    // Get initial height (should be the default single-line height)
    const initialHeight = await getTextareaHeight(page);
    
    // Type a single line of text
    await textarea.fill('Hello Marcus');
    await page.waitForTimeout(50);
    
    // Height should remain roughly the same (single line doesn't need expansion)
    // Allow tolerance for line-height rendering
    const heightAfterTyping = await getTextareaHeight(page);
    expect(Math.abs(heightAfterTyping - initialHeight)).toBeLessThanOrEqual(10);
    
    // The scroll height should be close to client height (no overflow for single line)
    const scrollHeight = await getTextareaScrollHeight(page);
    expect(scrollHeight).toBeLessThanOrEqual(heightAfterTyping + 10);
  });

  test('VAL-CHAT-INPUT-002: Multi-line input expands the textarea height', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Type first line
    await textarea.fill('Line 1');
    await page.waitForTimeout(50);
    const singleLineHeight = await getTextareaHeight(page);
    
    // Press Shift+Enter to add a new line
    await textarea.press('Shift+Enter');
    await textarea.type('Line 2');
    await page.waitForTimeout(100);
    
    // Height should have increased (should show at least 2 lines visible)
    // The textarea should auto-expand to show both lines
    const heightAfterTwoLines = await getTextareaHeight(page);
    expect(heightAfterTwoLines).toBeGreaterThan(singleLineHeight);
    
    // Verify we have 2 lines of content
    const content = await textarea.inputValue();
    expect(content).toContain('\n');
  });

  test('VAL-CHAT-INPUT-003: Textarea stops expanding at maximum height', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Get the max-height from CSS
    const maxHeight = await getTextareaMaxHeight(page);
    
    // Type many lines to test auto-expansion up to max-height
    // Use Shift+Enter for actual newlines to trigger expansion
    const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
    await typeMultiLineText(page, textarea, lines);
    
    // Wait for any height transitions
    await page.waitForTimeout(200);
    
    // Get the actual height after adding many lines
    const finalHeight = await getTextareaHeight(page);
    
    // The height should NOT exceed max-height (with small tolerance for rounding)
    expect(finalHeight).toBeLessThanOrEqual(maxHeight + 10);
    
    // Should be at or near the max height when many lines are added
    // If auto-expand is working, this should be close to maxHeight
    expect(finalHeight).toBeGreaterThanOrEqual(maxHeight - 10);
  });

  test('VAL-CHAT-INPUT-004: Scrollbar appears when content exceeds maximum height', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Add enough content to exceed the max-height and trigger overflow
    // Type with Shift+Enter to ensure actual newlines
    for (let i = 1; i <= 15; i++) {
      if (i > 1) {
        await textarea.press('Shift+Enter');
      }
      await textarea.type(`Line ${i}: This is a longer line of text that helps fill up the textarea to trigger overflow scrollbar behavior.`);
    }
    
    // Wait for any transitions
    await page.waitForTimeout(150);
    
    // The textarea should now have overflow (content larger than visible area)
    const hasOverflow = await hasTextareaOverflow(page);
    expect(hasOverflow).toBe(true);
    
    // The scroll height should be greater than the visible height
    const scrollHeight = await getTextareaScrollHeight(page);
    const visibleHeight = await getTextareaHeight(page);
    expect(scrollHeight).toBeGreaterThan(visibleHeight);
    
    // Verify we can scroll (scrollTop should be changeable)
    const canScroll = await page.evaluate(() => {
      const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      if (!textarea) return false;
      const originalScrollTop = textarea.scrollTop;
      textarea.scrollTop = textarea.scrollHeight;
      return textarea.scrollTop !== originalScrollTop || textarea.scrollHeight > textarea.clientHeight;
    });
    expect(canScroll).toBe(true);
  });

  test('VAL-CHAT-INPUT-005: Textarea behavior transitions correctly from expanding to scrolling', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Get initial state
    const initialHeight = await getTextareaHeight(page);
    const maxHeight = await getTextareaMaxHeight(page);
    
    // Stage 1: Single line - should have minimal height
    await textarea.fill('Short message');
    await page.waitForTimeout(50);
    const shortHeight = await getTextareaHeight(page);
    expect(Math.abs(shortHeight - initialHeight)).toBeLessThanOrEqual(15);
    
    // Stage 2: Few lines - should expand without overflow
    const lines2 = ['Line 1', 'Line 2', 'Line 3'];
    await textarea.fill('');
    await typeMultiLineText(page, textarea, lines2);
    await page.waitForTimeout(100);
    
    const expandedHeight = await getTextareaHeight(page);
    // Should be taller than single line
    expect(expandedHeight).toBeGreaterThan(shortHeight);
    
    // Stage 3: Many lines - should hit max and start scrolling
    const lines3 = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`);
    await textarea.fill('');
    await typeMultiLineText(page, textarea, lines3);
    await page.waitForTimeout(100);
    
    // Should be at or near max height (content is too long to fit in fewer lines)
    const maxedHeight = await getTextareaHeight(page);
    expect(maxedHeight).toBeGreaterThanOrEqual(maxHeight - 10);
    
    // Should now have overflow (scrollbar should be active)
    const manyLinesOverflow = await hasTextareaOverflow(page);
    expect(manyLinesOverflow).toBe(true);
    
    // Stage 4: Delete content - should return to smaller height
    await textarea.fill('Back to short');
    await page.waitForTimeout(100);
    const finalHeight = await getTextareaHeight(page);
    expect(finalHeight).toBeLessThanOrEqual(maxHeight);
  });

  test('VAL-CHAT-INPUT-006: User can scroll through long content in textarea', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Add content that exceeds max-height using Shift+Enter
    for (let i = 1; i <= 20; i++) {
      if (i > 1) {
        await textarea.press('Shift+Enter');
      }
      await textarea.type(`Line ${i}: This line adds more content for scrolling.`);
    }
    await page.waitForTimeout(100);
    
    // Focus the textarea
    await textarea.focus();
    
    // Verify we can scroll within the textarea
    const scrollInfo = await page.evaluate(() => {
      const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      if (!textarea) return { canScroll: false, scrollHeight: 0, clientHeight: 0 };
      
      const scrollHeight = textarea.scrollHeight;
      const clientHeight = textarea.clientHeight;
      const canScroll = scrollHeight > clientHeight;
      
      return { canScroll, scrollHeight, clientHeight };
    });
    
    expect(scrollInfo.canScroll).toBe(true);
    expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight);
    
    // Simulate scrolling down
    await page.evaluate(() => {
      const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    });
    
    // Verify scroll position changed
    const scrollTopAfter = await page.evaluate(() => {
      const textarea = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      return textarea ? textarea.scrollTop : 0;
    });
    
    expect(scrollTopAfter).toBeGreaterThan(0);
  });

  test('VAL-CHAT-INPUT-007: Send button remains accessible when textarea has long content', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    const sendBtn = page.getByRole('button', { name: 'Send message' });
    
    // Add long content using Shift+Enter for newlines
    for (let i = 1; i <= 15; i++) {
      if (i > 1) {
        await textarea.press('Shift+Enter');
      }
      await textarea.type(`Line ${i}`);
    }
    await page.waitForTimeout(100);
    
    // Send button should still be visible and enabled
    await expect(sendBtn).toBeVisible();
    await expect(sendBtn).toBeEnabled();
    
    // Click send - should work without issues
    await sendBtn.click();
    
    // Wait for message to appear
    await expect(page.getByText(/Line 1/)).toBeVisible({ timeout: 10000 });
    
    // Textarea should be cleared after sending
    await expect(textarea).toHaveValue('');
  });

  test('VAL-CHAT-INPUT-008: Textarea maintains correct state across session', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Start with long content - type using Shift+Enter for newlines
    const lines1 = Array.from({ length: 8 }, (_, i) => `Message 1 line ${i + 1}`);
    await typeMultiLineText(page, textarea, lines1);
    await page.waitForTimeout(100);
    
    // Should have overflow
    const hasOverflowBeforeSend = await hasTextareaOverflow(page);
    expect(hasOverflowBeforeSend).toBe(true);
    
    // Send the message
    await page.getByRole('button', { name: 'Send message' }).click();
    
    // Wait for message to appear
    await expect(page.getByText(/Message 1 line 1/)).toBeVisible({ timeout: 10000 });
    
    // Textarea should be cleared
    await expect(textarea).toHaveValue('');
    
    // Add more content for another message
    const lines2 = Array.from({ length: 5 }, (_, i) => `Message 2 line ${i + 1}`);
    await typeMultiLineText(page, textarea, lines2);
    await page.waitForTimeout(100);
    
    // Should still expand correctly
    const height = await getTextareaHeight(page);
    const maxHeight = await getTextareaMaxHeight(page);
    expect(height).toBeLessThanOrEqual(maxHeight);
  });

  test('VAL-CHAT-INPUT-009: Textarea focus and blur behavior with long content', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Add long content using Shift+Enter for newlines
    for (let i = 1; i <= 15; i++) {
      if (i > 1) {
        await textarea.press('Shift+Enter');
      }
      await textarea.type(`Line ${i}`);
    }
    await page.waitForTimeout(100);
    
    // Focus the textarea
    await textarea.focus();
    await expect(textarea).toBeFocused();
    
    // Check styling when focused
    const isFocused = await page.evaluate(() => {
      const el = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      return el === document.activeElement;
    });
    expect(isFocused).toBe(true);
    
    // Blur (click elsewhere)
    await page.click('body');
    await page.waitForTimeout(50);
    
    // Should no longer be focused
    const isStillFocused = await page.evaluate(() => {
      const el = document.querySelector('.meditation-chat__textarea') as HTMLTextAreaElement;
      return el === document.activeElement;
    });
    expect(isStillFocused).toBe(false);
    
    // Content should still be intact
    await textarea.focus();
    const content = await textarea.inputValue();
    expect(content).toContain('Line 1');
    expect(content).toContain('Line 15');
  });

  test('VAL-CHAT-INPUT-010: Textarea returns to default height when content is cleared', async ({ page }) => {
    const textarea = page.getByLabel('Type your message to Marcus');
    
    // Add multi-line content
    const lines = ['Some content', 'Line 2', 'Line 3'];
    await typeMultiLineText(page, textarea, lines);
    await page.waitForTimeout(100);
    
    // Get expanded height
    const expandedHeight = await getTextareaHeight(page);
    
    // Select all and delete
    await textarea.selectText();
    await textarea.press('Delete');
    await page.waitForTimeout(100);
    
    // Textarea should be empty
    const content = await textarea.inputValue();
    expect(content).toBe('');
    
    // Should be at default single-line height (or minimal height when empty)
    const height = await getTextareaHeight(page);
    expect(height).toBeLessThan(expandedHeight);
    // Should be close to the original default height
    expect(height).toBeLessThan(80);
  });
});
