import { test, expect } from '@playwright/test';

/**
 * Voice-Enhanced Session E2E Test
 * 
 * Tests voice input and voice output functionality in the meditation chat:
 * - Voice controls are present and interactive
 * - TTS playback can be toggled on/off
 * 
 * Note: Actual voice recording/transcription requires real microphone access,
 * which Playwright doesn't support directly. We test the UI/UX flow instead.
 */

/**
 * Helper: Clear all data via API to start fresh
 */
async function clearAllData() {
  await fetch('http://localhost:3100/api/export/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('Voice-Enhanced Session', () => {
  test.beforeEach(async () => {
    await clearAllData();
  });

  test('voice controls are present in the meditation chat interface', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to meditation and begin session
    await page.getByRole('button', { name: 'Begin meditation session' }).click();
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();

    // Voice controls container should exist and be visible
    const voiceControls = page.locator('.voice-controls');
    await expect(voiceControls).toBeVisible();
    await expect(voiceControls).toHaveAttribute('role', 'toolbar');
    await expect(voiceControls).toHaveAttribute('aria-label', 'Voice controls');

    // Microphone button
    const micButton = voiceControls.locator('.voice-controls__mic');
    await expect(micButton).toBeVisible();
    await expect(micButton).toHaveAttribute('title');

    // Speaker/TTS button
    const speakerButton = voiceControls.locator('.voice-controls__speaker');
    await expect(speakerButton).toBeVisible();
    await expect(speakerButton).toHaveAttribute('title');
  });

  test('voice output (TTS) can be toggled on and off', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to meditation and begin session
    await page.getByRole('button', { name: 'Begin meditation session' }).click();
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();

    // Toggle voice output (TTS)
    const speakerButton = page.locator('.voice-controls__speaker');
    const initialPressed = await speakerButton.getAttribute('aria-pressed');
    
    // Click to toggle on
    await speakerButton.click();
    const toggledPressed = await speakerButton.getAttribute('aria-pressed');
    expect(toggledPressed).not.toBe(initialPressed);
    
    // The button should indicate it's now active
    await expect(speakerButton).toHaveClass(/voice-controls__button--active/);

    // Toggle back off
    await speakerButton.click();
    const finalPressed = await speakerButton.getAttribute('aria-pressed');
    expect(finalPressed).toBe(initialPressed);
    await expect(speakerButton).not.toHaveClass(/voice-controls__button--active/);
  });

  test('voice output bridge element exists for programmatic TTS', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to meditation and begin session
    await page.getByRole('button', { name: 'Begin meditation session' }).click();
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();

    // Voice output bridge for programmatic TTS dispatching
    const voiceBridge = page.locator('.voice-output-bridge');
    await expect(voiceBridge).toHaveCount(1);
    await expect(voiceBridge).toHaveAttribute('hidden', '');
    await expect(voiceBridge).toHaveAttribute('aria-hidden', 'true');
  });

  test('voice controls are keyboard accessible', async ({ page }) => {
    // Create profile
    await page.goto('/');
    
    const nameInput = page.getByLabel('Name');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Stefano');
      await page.getByRole('button', { name: 'Begin Journey' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to meditation and begin session
    await page.getByRole('button', { name: 'Begin meditation session' }).click();
    await page.getByRole('button', { name: 'Begin Meditation' }).click();
    await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();

    // Voice controls should be keyboard accessible
    const micButton = page.locator('.voice-controls__mic');
    await expect(micButton).toBeVisible();
    await expect(micButton).toBeEnabled();
    await expect(micButton).toHaveAttribute('title');
    await expect(micButton).toHaveAttribute('aria-pressed');
  });
});
