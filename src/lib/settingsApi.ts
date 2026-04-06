/**
 * API client for settings endpoints
 */

const BASE_URL = '/api/settings';

/**
 * Response from GET /api/settings
 */
export interface SettingsResponse {
  selectedModel: string;
  systemInfo: {
    totalRamGB: number;
    recommendedModelSize: string;
    recommendedModelDescription: string;
  } | null;
  installedModels: string[];
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
   * Update settings (e.g., selected model)
   */
  async updateSettings(updates: { selectedModel?: string }): Promise<SettingsResponse> {
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
