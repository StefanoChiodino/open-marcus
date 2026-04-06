/**
 * Settings service - manages application settings with persistence
 * and provides system information (e.g., RAM detection)
 */

import os from 'node:os';
import { getDatabase } from '../db/database.js';

/**
 * Application settings interface
 */
export interface AppSettings {
  selectedModel: string;
}

/**
 * System information relevant for model recommendations
 */
export interface SystemInfo {
  totalRamGB: number;
  recommendedModelSize: string;
  recommendedModelDescription: string;
}

const SETTINGS_KEY_MODEL = 'ollama.model';

/**
 * Determine recommended model based on available RAM
 */
function getRecommendationForRam(ramGB: number): { size: string; description: string } {
  if (ramGB >= 64) {
    return {
      size: '70b',
      description: '70B+ model recommended (e.g., llama3.1:70b, qwen2.5:72b)',
    };
  }
  if (ramGB >= 32) {
    return {
      size: '14b',
      description: '14B model recommended (e.g., llama3.2:14b, qwen2.5:14b)',
    };
  }
  if (ramGB >= 16) {
    return {
      size: '7b',
      description: '7B–8B model recommended (e.g., llama3.2:latest, qwen2.5:7b)',
    };
  }
  // Less than 16 GB
  return {
    size: '3b',
    description: '3B model recommended (e.g., llama3.2:3b, qwen2.5:3b)',
  };
}

/**
 * Settings service: CRUD for application settings
 */
export class SettingsService {
  /**
   * Get all settings from the database
   */
  getSettings(): AppSettings {
    const db = getDatabase();

    // Get selected model if set; otherwise use environment or default
    const savedModel = db.getSetting(SETTINGS_KEY_MODEL);

    const selectedModel =
      savedModel ||
      process.env.OLLAMA_MODEL ||
      'llama3.2:latest';

    return { selectedModel };
  }

  /**
   * Update a specific setting
   */
  updateSetting(key: string, value: string): void {
    const db = getDatabase();
    db.setSetting(key, value);
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(updates: Partial<AppSettings>): AppSettings {
    if (updates.selectedModel !== undefined) {
      this.updateSetting(SETTINGS_KEY_MODEL, updates.selectedModel);
    }
    return this.getSettings();
  }

  /**
   * Get system information for model recommendations
   */
  getSystemInfo(): SystemInfo {
    const totalBytes = os.totalmem();
    const totalRamGB = Math.round(totalBytes / (1024 * 1024 * 1024));
    const recommendation = getRecommendationForRam(totalRamGB);

    return {
      totalRamGB,
      recommendedModelSize: recommendation.size,
      recommendedModelDescription: recommendation.description,
    };
  }
}

// Singleton
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService();
  }
  return settingsServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSettingsService(): void {
  settingsServiceInstance = null;
}
