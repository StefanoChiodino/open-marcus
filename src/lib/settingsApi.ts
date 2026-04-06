/**
 * API client for settings endpoints
 */

const BASE_URL = '/api/settings';

/**
 * Model information including size for RAM display
 */
export interface ModelInfo {
  name: string;
  sizeBytes: number;
  /** Human-readable size string, e.g., "1.2 GB" */
  sizeLabel: string;
  /** Estimated RAM usage when loaded, e.g., "~2 GB RAM" */
  ramUsageLabel: string;
}

/**
 * Curated TTS voices for the voice dropdown
 * These are 6 English neural voices from edge-tts
 */
export const TTS_VOICES = [
  'en-US-GuyNeural',
  'en-US-ChristopherNeural',
  'en-US-BrianNeural',
  'en-GB-ThomasNeural',
  'en-US-JennyNeural',
  'en-US-MichelleNeural',
] as const;

export type TtsVoice = typeof TTS_VOICES[number];

/**
 * TTS rate range: -50% to +100%
 */
export const TTS_MIN_RATE = -50;
export const TTS_MAX_RATE = 100;

/**
 * TTS pitch range: -50Hz to +50Hz
 */
export const TTS_MIN_PITCH = -50;
export const TTS_MAX_PITCH = 50;

/**
 * Response from GET /api/settings
 */
export interface SettingsResponse {
  selectedModel: string;
  ttsVoice: string;
  ttsRate: string;
  ttsPitch: string;
  systemInfo: {
    totalRamGB: number;
    recommendedModel: string;
    recommendedModelAlt: string[];
    recommendedTier: string;
    recommendedTierDescription: string;
  } | null;
  installedModels: string[];
  installedModelsInfo: ModelInfo[];
  ollamaOnline: boolean;
}

export class SettingsAPIClient {
  /**
   * Fetch all settings, system info, and installed models
   */
  async getSettings(): Promise<SettingsResponse> {
    const response = await fetch(BASE_URL);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to fetch settings: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update settings (e.g., selected model, TTS settings)
   */
  async updateSettings(updates: { 
    selectedModel?: string; 
    ttsVoice?: string;
    ttsRate?: string;
    ttsPitch?: string;
  }): Promise<SettingsResponse> {
    const response = await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to update settings: ${response.status}`);
    }

    return response.json();
  }
}

export const settingsAPI = new SettingsAPIClient();
