import { test, expect, Page } from '@playwright/test';
import { clearTestData, registerTestUser, clearAuthToken } from './test-db-helpers';

/**
 * Comprehensive TTS Settings Tests
 * 
 * Tests TTS (Text-to-Speech) settings functionality:
 * - VAL-SETTINGS-TTS-001: TTS section shows voice dropdown with 6 options
 * - VAL-SETTINGS-TTS-002: TTS section shows rate slider
 * - VAL-SETTINGS-TTS-003: TTS section shows pitch slider
 * - VAL-SETTINGS-TTS-004: Changing TTS settings saves immediately via API
 * - VAL-SETTINGS-TTS-005: TTS settings persist after page reload
 * - VAL-SETTINGS-TTS-006: TTS voice applies in session
 */

const BACKEND_URL = 'http://localhost:3100';
const FRONTEND_URL = 'http://localhost:3101';

// 6 TTS voices from settingsApi.ts
const TTS_VOICES = [
  'en-US-GuyNeural',
  'en-US-ChristopherNeural',
  'en-US-BrianNeural',
  'en-GB-ThomasNeural',
  'en-US-JennyNeural',
  'en-US-MichelleNeural',
];

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
 * Helper: Reset TTS settings to defaults
 * Called after clearAllData to ensure clean TTS state
 */
async function resetTtsSettingsToDefaults(token: string) {
  // Reset TTS settings to defaults via the settings API
  const response = await fetch(`${BACKEND_URL}/api/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ttsVoice: 'en-US-GuyNeural',
      ttsRate: '+25%',
      ttsPitch: '+0Hz',
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to reset TTS settings: ${response.status}`);
  }
}

/**
 * Helper: Create a profile with the given name and bio via UI onboarding
 */
async function createProfile(page: Page, name: string, bio?: string) {
  const token = await registerAndGetToken();

  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');

  // Clear any persisted session ID before setting new auth token
  await page.evaluate(() => {
    localStorage.removeItem('openmarcus-active-session-id');
  });

  // Store token in localStorage
  await page.evaluate((t: string) => {
    localStorage.setItem('openmarcus-auth-token', t);
  }, token);

  // Clear any existing data with the token
  await clearAllData(token);
  
  // Reset TTS settings to defaults to ensure clean state
  await resetTtsSettingsToDefaults(token);

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
  
  return token;
}

/**
 * Helper: Navigate to the settings page using sidebar link
 */
async function goToSettingsPage(page: Page) {
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Get current TTS settings from the API
 */
async function getTtsSettings(token: string): Promise<{ ttsVoice: string; ttsRate: string; ttsPitch: string }> {
  const response = await fetch(`${BACKEND_URL}/api/settings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to get settings: ${response.status}`);
  }
  const data = await response.json();
  return {
    ttsVoice: data.ttsVoice,
    ttsRate: data.ttsRate,
    ttsPitch: data.ttsPitch,
  };
}

test.describe('Comprehensive TTS Settings Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all test data before each test
    await clearTestData();
    // Navigate to app first
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await clearAuthToken(page);
  });

  test.describe('VAL-SETTINGS-TTS-001: TTS section shows voice dropdown', () => {
    test('Voice dropdown shows 6 voice options', async ({ page }) => {
      // Create profile first
      await createProfile(page, 'TTS Voice Test User', 'Testing voice dropdown');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Should see Voice Output section heading
      await expect(page.getByRole('heading', { name: 'Voice Output' })).toBeVisible();
      
      // Should see Voice label for the dropdown
      await expect(page.locator('label[for="tts-voice-select"]')).toContainText('Voice');
      
      // Should see the voice dropdown select element
      const voiceSelect = page.locator('#tts-voice-select');
      await expect(voiceSelect).toBeVisible();
      
      // Get all options in the dropdown (count without opening)
      const options = page.locator('#tts-voice-select option');
      const count = await options.count();
      
      // Should have exactly 6 voice options
      expect(count).toBe(6);
      
      // Verify each voice is in the options (don't check visibility - options are inside select)
      const allOptionsText = await options.allTextContents();
      for (const voice of TTS_VOICES) {
        expect(allOptionsText).toContain(voice);
      }
    });

    test('Voice dropdown is accessible with proper labeling', async ({ page }) => {
      // Create profile first
      await createProfile(page, 'TTS Accessible Voice User', 'Testing accessible voice');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Voice dropdown should have accessible label
      const voiceSelect = page.locator('#tts-voice-select');
      await expect(voiceSelect).toBeVisible();
      
      // The label "Voice" should be associated with the select via htmlFor
      const voiceLabel = page.locator('label[for="tts-voice-select"]');
      await expect(voiceLabel).toContainText('Voice');
      
      // Dropdown should be enabled (not disabled) when not saving
      await expect(voiceSelect).toBeEnabled();
    });

    test('Default voice is one of the 6 available voices', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Default Voice User', 'Testing default voice');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Selected voice should be one of the 6 TTS voices
      const voiceSelect = page.locator('#tts-voice-select');
      const selectedValue = await voiceSelect.inputValue();
      expect(TTS_VOICES).toContain(selectedValue);
    });
  });

  test.describe('VAL-SETTINGS-TTS-002: TTS section shows rate slider', () => {
    test('Rate slider is visible with current value displayed', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Rate Slider Test User', 'Testing rate slider');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Should see Speed label
      const speedLabel = page.locator('label[for="tts-rate-slider"]');
      await expect(speedLabel).toBeVisible();
      await expect(speedLabel).toContainText('Speed');
      
      // Should see the rate slider input
      const rateSlider = page.locator('#tts-rate-slider');
      await expect(rateSlider).toBeVisible();
      await expect(rateSlider).toHaveAttribute('type', 'range');
      
      // Should see a value displayed (some percentage)
      const labelText = await speedLabel.textContent();
      expect(labelText).toMatch(/Speed:\s*[+-]?\d+%/);
      
      // Slider should have proper min/max values
      await expect(rateSlider).toHaveAttribute('min', '-50');
      await expect(rateSlider).toHaveAttribute('max', '100');
    });

    test('Rate slider shows min/max range labels', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Rate Range Test User', 'Testing rate range');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Should see range labels at ends of slider container
      const sliderContainer = page.locator('.tts-settings__slider-container').first();
      await expect(sliderContainer).toBeVisible();
      
      // Should show -50% and +100% somewhere in the container (combined or separate)
      const containerText = await sliderContainer.textContent();
      expect(containerText).toContain('-50%');
      expect(containerText).toContain('100%');
    });

    test('Rate slider can be adjusted', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Rate Adjust User', 'Testing rate adjustment');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Get the rate slider
      const rateSlider = page.locator('#tts-rate-slider');
      
      // Get initial value
      const initialValue = await rateSlider.inputValue();
      
      // Change the slider value
      await rateSlider.fill('50');
      
      // Verify value changed
      const newValue = await rateSlider.inputValue();
      expect(newValue).toBe('50');
      expect(newValue).not.toBe(initialValue);
    });
  });

  test.describe('VAL-SETTINGS-TTS-003: TTS section shows pitch slider', () => {
    test('Pitch slider is visible with current value displayed', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Pitch Slider Test User', 'Testing pitch slider');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Should see Pitch label
      const pitchLabel = page.locator('label[for="tts-pitch-slider"]');
      await expect(pitchLabel).toBeVisible();
      await expect(pitchLabel).toContainText('Pitch');
      
      // Should see the pitch slider input
      const pitchSlider = page.locator('#tts-pitch-slider');
      await expect(pitchSlider).toBeVisible();
      await expect(pitchSlider).toHaveAttribute('type', 'range');
      
      // Should see a value displayed (some Hz value)
      const labelText = await pitchLabel.textContent();
      expect(labelText).toMatch(/Pitch:\s*[+-]?\d+Hz/);
      
      // Slider should have proper min/max values (-50 to +50)
      await expect(pitchSlider).toHaveAttribute('min', '-50');
      await expect(pitchSlider).toHaveAttribute('max', '50');
    });

    test('Pitch slider shows min/max range labels', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Pitch Range Test User', 'Testing pitch range');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Should see range labels at ends of slider container (second slider container)
      const sliderContainers = page.locator('.tts-settings__slider-container');
      const secondSlider = sliderContainers.nth(1); // Second slider container (pitch)
      await expect(secondSlider).toBeVisible();
      
      // Should show -50Hz and +50Hz somewhere in the container
      const containerText = await secondSlider.textContent();
      expect(containerText).toContain('-50Hz');
      expect(containerText).toContain('50Hz');
    });

    test('Pitch slider can be adjusted', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Pitch Adjust User', 'Testing pitch adjustment');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Get the pitch slider
      const pitchSlider = page.locator('#tts-pitch-slider');
      
      // Verify slider exists and is interactive
      await expect(pitchSlider).toBeVisible();
      await expect(pitchSlider).toBeEnabled();
      
      // Verify it's a range input with correct range
      await expect(pitchSlider).toHaveAttribute('type', 'range');
      await expect(pitchSlider).toHaveAttribute('min', '-50');
      await expect(pitchSlider).toHaveAttribute('max', '50');
      
      // Change the slider value using fill
      await pitchSlider.fill('25');
      
      // Verify the value was updated
      await expect(pitchSlider).toHaveValue('25');
    });
  });

  test.describe('VAL-SETTINGS-TTS-004: Changing TTS settings saves immediately', () => {
    test('Changing voice triggers API save', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Voice Save User', 'Testing voice save');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Set up network monitoring for the settings API call
      const settingsRequestPromise = page.waitForRequest(request => 
        request.url().includes('/api/settings') && request.method() === 'PUT'
      );
      
      // Change the voice selection
      const voiceSelect = page.locator('#tts-voice-select');
      await voiceSelect.selectOption('en-US-BrianNeural');
      
      // Wait for the PUT request
      const settingsRequest = await settingsRequestPromise;
      
      // Verify it's a PUT request to /api/settings
      expect(settingsRequest.url()).toContain('/api/settings');
      expect(settingsRequest.method()).toBe('PUT');
      
      // Verify the request body contains the new voice
      const requestBody = await settingsRequest.postDataJSON();
      expect(requestBody).toHaveProperty('ttsVoice');
      expect(requestBody.ttsVoice).toBe('en-US-BrianNeural');
    });

    test('Changing rate triggers API save on mouse up', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Rate Save User', 'Testing rate save');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Get the rate slider
      const rateSlider = page.locator('#tts-rate-slider');
      
      // Change the rate slider value and trigger mouseup to commit
      await rateSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '50');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      
      // Wait for the PUT request to settings API
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Verify response is successful
      const response = await responsePromise;
      expect(response.url()).toContain('/api/settings');
    });

    test('Changing pitch triggers API save on mouse up', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Pitch Save User', 'Testing pitch save');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Get the pitch slider
      const pitchSlider = page.locator('#tts-pitch-slider');
      
      // Change the pitch slider value and trigger mouseup to commit
      await pitchSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '-25');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      
      // Wait for the PUT request to settings API
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Verify response is successful
      const response = await responsePromise;
      expect(response.url()).toContain('/api/settings');
    });

    test('Settings save shows success toast', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Toast Save User', 'Testing toast on save');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change the voice selection
      const voiceSelect = page.locator('#tts-voice-select');
      await voiceSelect.selectOption('en-US-ChristopherNeural');
      
      // Should see a success toast after API save
      await expect(page.getByText('Voice updated')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('VAL-SETTINGS-TTS-005: TTS settings persist after reload', () => {
    test('Voice selection persists after page reload', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Voice Persist User', 'Testing voice persistence');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to a different one
      const voiceSelect = page.locator('#tts-voice-select');
      await voiceSelect.selectOption('en-US-JennyNeural');
      
      // Wait for the API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to settings
      await goToSettingsPage(page);
      
      // Voice selection should still be JennyNeural
      await expect(voiceSelect).toHaveValue('en-US-JennyNeural');
    });

    test('Rate value persists after page reload', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Rate Persist User', 'Testing rate persistence');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change rate to +50% by dragging slider and releasing (mouseup commits)
      const rateSlider = page.locator('#tts-rate-slider');
      await rateSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '50');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      
      // Wait for the API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to settings
      await goToSettingsPage(page);
      
      // Rate should still be +50%
      await expect(rateSlider).toHaveValue('50');
      
      // The displayed value should also show +50%
      const speedLabel = page.locator('label[for="tts-rate-slider"]');
      await expect(speedLabel).toContainText('+50%');
    });

    test('Pitch value persists after page reload', async ({ page }) => {
      // Create profile
      await createProfile(page, 'Pitch Persist User', 'Testing pitch persistence');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change pitch to -25Hz by dragging slider and releasing (mouseup commits)
      const pitchSlider = page.locator('#tts-pitch-slider');
      await pitchSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '-25');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      
      // Wait for the API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Navigate back to settings
      await goToSettingsPage(page);
      
      // Pitch should still be -25
      await expect(pitchSlider).toHaveValue('-25');
      
      // The displayed value should also show -25Hz
      const pitchLabel = page.locator('label[for="tts-pitch-slider"]');
      await expect(pitchLabel).toContainText('-25Hz');
    });

    test('Settings persist via API after reload', async ({ page }) => {
      // Create profile and get token
      const token = await createProfile(page, 'API Persist User', 'Testing API persistence');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Wait for voice dropdown to be visible
      const voiceSelect = page.locator('#tts-voice-select');
      await expect(voiceSelect).toBeVisible();
      
      // Change all TTS settings
      await voiceSelect.selectOption('en-US-JennyNeural');
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Change rate with mouseup to commit
      const rateSlider = page.locator('#tts-rate-slider');
      await rateSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '75');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Change pitch with mouseup to commit
      const pitchSlider = page.locator('#tts-pitch-slider');
      await pitchSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '25');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify via API that settings were saved
      const apiSettings = await getTtsSettings(token);
      expect(apiSettings.ttsVoice).toBe('en-US-JennyNeural');
      expect(apiSettings.ttsRate).toBe('+75%');
      expect(apiSettings.ttsPitch).toBe('+25Hz');
    });
  });

  test.describe('VAL-SETTINGS-TTS-006: TTS voice applies in session', () => {
    test('Session shows voice controls when TTS is configured', async ({ page }) => {
      // Create profile
      await createProfile(page, 'TTS Session User', 'Testing TTS in session');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice to Brian
      await page.locator('#tts-voice-select').selectOption('en-US-BrianNeural');
      
      // Wait for save
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Navigate to session
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      
      // Start meditation session
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      
      // Should see active session
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();
      
      // Voice controls should be visible - both mic and speaker buttons
      await expect(page.locator('.voice-controls')).toBeVisible();
      await expect(page.locator('.voice-controls__mic')).toBeVisible();
      await expect(page.locator('.voice-controls__speaker')).toBeVisible();
    });

    test('Voice controls are visible and interactive in session', async ({ page }) => {
      // Create profile
      await createProfile(page, 'TTS Toggle User', 'Testing TTS toggle');
      
      // Go back to home and start session
      await page.getByRole('link', { name: 'Home' }).click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Begin Meditation' }).click();
      
      // Should see active session with voice controls
      await expect(page.getByRole('main', { name: 'Active Meditation Session' })).toBeVisible();
      
      // Speaker button should be visible
      const speakerButton = page.locator('.voice-controls__speaker');
      await expect(speakerButton).toBeVisible();
      
      // Microphone button should be visible
      const micButton = page.locator('.voice-controls__mic');
      await expect(micButton).toBeVisible();
    });
  });

  test.describe('TTS Settings - All Controls Together', () => {
    test('All TTS controls visible in Voice Output section', async ({ page }) => {
      // Create profile
      await createProfile(page, 'All Controls User', 'Testing all TTS controls');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Voice Output section should be visible
      await expect(page.getByRole('heading', { name: 'Voice Output' })).toBeVisible();
      
      // Voice dropdown should be visible
      await expect(page.locator('#tts-voice-select')).toBeVisible();
      
      // Rate slider should be visible
      await expect(page.locator('#tts-rate-slider')).toBeVisible();
      
      // Pitch slider should be visible
      await expect(page.locator('#tts-pitch-slider')).toBeVisible();
      
      // Help text should be visible for all controls
      await expect(page.getByText('Select the voice used for text-to-speech output during meditation sessions.')).toBeVisible();
      await expect(page.getByText('Adjust speech speed. Default is +25% (faster than normal).')).toBeVisible();
      await expect(page.getByText('Adjust speech pitch. Default is +0Hz (natural pitch).')).toBeVisible();
    });

    test('Can change all TTS settings and verify they are saved', async ({ page }) => {
      // Create profile and get token
      const token = await createProfile(page, 'All Save User', 'Testing all settings save');
      
      // Navigate to settings page
      await goToSettingsPage(page);
      
      // Change voice
      await page.locator('#tts-voice-select').selectOption('en-US-MichelleNeural');
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Change rate using mouseup to commit
      const rateSlider = page.locator('#tts-rate-slider');
      await rateSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '-10');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Change pitch using mouseup to commit
      const pitchSlider = page.locator('#tts-pitch-slider');
      await pitchSlider.evaluate((el: HTMLInputElement) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeInputValueSetter = (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') as any).set;
        nativeInputValueSetter.call(el, '10');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('mouseup', { bubbles: true }));
      });
      await page.waitForResponse(response => 
        response.url().includes('/api/settings') && response.status() === 200
      );
      
      // Verify via API
      const settings = await getTtsSettings(token);
      expect(settings.ttsVoice).toBe('en-US-MichelleNeural');
      expect(settings.ttsRate).toBe('-10%');
      expect(settings.ttsPitch).toBe('+10Hz');
    });
  });
});
