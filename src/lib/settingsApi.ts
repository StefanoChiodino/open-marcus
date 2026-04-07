/**
 * API client for settings endpoints
 */

import { getAuthHeader } from './auth';

const BASE_URL = '/api/settings';

function authHeaders(): HeadersInit {
  const header = getAuthHeader();
  return header ? { Authorization: header } : {};
}

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
 * STT Model information from servers/stt/ directory
 */
export interface SttModelInfo {
  name: string;
  path: string;
  sizeMB: number;
  memoryMB: number;
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
  sttModel: string;
  systemInfo: {
    totalRamGB: number;
    recommendedModel: string;
    recommendedModelAlt: string[];
    recommendedTier: string;
    recommendedTierDescription: string;
  } | null;
  installedModels: string[];
  installedModelsInfo: ModelInfo[];
  recommendedModelsInfo: ModelInfo[];
  ollamaOnline: boolean;
}

export class SettingsAPIClient {
  /**
   * Fetch all settings, system info, and installed models
   */
  async getSettings(): Promise<SettingsResponse> {
    const response = await fetch(BASE_URL, {
      headers: authHeaders(),
    });

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
    sttModel?: string;
  }): Promise<SettingsResponse> {
    const response = await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to update settings: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Pull (download) a model from Ollama with progress streaming.
   * Returns a ReadableStream that yields progress events.
   */
  pullModel(modelName: string): ReadableStream<PullProgress> {
    return new ReadableStream({
      async start(controller) {
        const response = await fetch(`${BASE_URL}/pull-model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ model: modelName }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to start download' }));
          controller.error(new Error(error.error || `HTTP ${response.status}`));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.error(new Error('No response body'));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix
                controller.enqueue(data as PullProgress);
                if (data.status === 'success' || data.status === 'error' || data.status === 'already_installed') {
                  reader.cancel();
                  return;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  /**
   * Get list of available STT models from servers/stt/ directory
   */
  async getSttModels(): Promise<SttModelInfo[]> {
    const response = await fetch(`${BASE_URL}/stt-models`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to fetch STT models: ${response.status}`);
    }

    const data = await response.json();
    return data.models as SttModelInfo[];
  }

  /**
   * Reload the STT model with a new model directory.
   * Returns the result of the hot-reload operation.
   */
  async reloadSttModel(modelDir: string): Promise<{ success: boolean; message: string; model_dir: string }> {
    const response = await fetch(`${BASE_URL}/stt-reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ modelDir }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to reload STT model: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Progress update during model pull
 */
export interface PullProgress {
  status: string;
  percent?: number;
  completed?: number;
  total?: number;
  message?: string;
}

export const settingsAPI = new SettingsAPIClient();
