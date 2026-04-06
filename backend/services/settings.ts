/**
 * Settings service - manages application settings with persistence
 * and provides system information (e.g., RAM detection)
 */

import os from 'node:os';
import type { DatabaseService } from '../db/database.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Application settings interface
 */
export interface AppSettings {
  selectedModel: string;
}

/**
 * RAM tier for model recommendation
 * Based on research (April 2026): Gemma 4 and Qwen 3.5 are the top open-weight model families
 */
export type ModelRamTier = '2b' | '4b' | '26b-a4b' | '27b-31b';

const SETTINGS_KEY_MODEL = 'ollama.model';

/**
 * Model recommendation based on available RAM
 *
 * Research findings (April 2026):
 * - Gemma 4 26B-A4B MoE achieves ~97% of dense 31B quality at 8x less compute
 * - Gemma 4 leads in coding (80% LiveCodeBench vs Qwen's ~43%) and reasoning
 * - Qwen 3.5 leads in 2B/4B static benchmarks but Gemma has audio support at those sizes
 * - Both families use Apache 2.0 license (no commercial restrictions)
 */
interface RamRecommendation {
  tier: ModelRamTier;
  recommendedModel: string;       // Primary recommendation (best quality/speed balance)
  altModels: string[];            // Alternative models at same tier
  minRamGB: number;
  description: string;
}

const MODEL_RECOMMENDATIONS: RamRecommendation[] = [
  {
    tier: '2b',
    recommendedModel: 'gemma4:2b',
    altModels: ['qwen3.5:2b', 'llama3.2:2b'],
    minRamGB: 2,
    description: '2B models for mobile/low-RAM devices (~1.5-2GB memory)',
  },
  {
    tier: '4b',
    recommendedModel: 'gemma4:4b',
    altModels: ['qwen3.5:4b', 'llama3.2:3b'],
    minRamGB: 4,
    description: '4B models for compact inference (~3-5GB memory)',
  },
  {
    tier: '26b-a4b',
    recommendedModel: 'gemma4:26b-a4b',
    altModels: ['qwen3.5:27b', 'llama3.2:14b'],
    minRamGB: 8,
    description: '26B MoE (4B active) — best quality/speed balance (~8-12GB memory)',
  },
  {
    tier: '27b-31b',
    recommendedModel: 'gemma4:31b',
    altModels: ['qwen3.5:27b', 'gemma4:26b-a4b'],
    minRamGB: 16,
    description: 'Dense 27-31B models for best quality (~18-35GB memory)',
  },
];

/**
 * Find the best model tier for available RAM
 */
function getRecommendationForRam(ramGB: number): RamRecommendation {
  // Find the highest tier that fits in available RAM
  // Iterate from highest to lowest, return first that fits
  for (let i = MODEL_RECOMMENDATIONS.length - 1; i >= 0; i--) {
    if (ramGB >= MODEL_RECOMMENDATIONS[i].minRamGB) {
      return MODEL_RECOMMENDATIONS[i];
    }
  }
  // Fallback to smallest if somehow RAM is < 2GB
  return MODEL_RECOMMENDATIONS[0];
}

/**
 * System information relevant for model recommendations
 */
export interface SystemInfo {
  totalRamGB: number;
  recommendedModel: string;              // Best model for this RAM tier
  recommendedModelAlt: string[];         // Alternative models at same tier
  recommendedTier: ModelRamTier;         // RAM tier category
  recommendedTierDescription: string;    // Human-readable description
}

/**
 * Settings service: CRUD for application settings
 */
export class SettingsService {
  private db: DatabaseService | null = null;
  private dbGetter: () => DatabaseService;

  constructor(dbGetter?: () => DatabaseService) {
    this.dbGetter = dbGetter || (() => {
      const { getDatabase } = require('../db/database.js');
      return getDatabase();
    });
  }

  private getDb(): DatabaseService {
    if (!this.db) {
      this.db = this.dbGetter();
    }
    return this.db;
  }

  /**
   * Get all settings from the database
   */
  getSettings(): AppSettings {
    const db = this.getDb();

    // Get selected model if set; otherwise use environment or default
    const savedModel = db.getSetting(SETTINGS_KEY_MODEL);

    if (savedModel) {
      return { selectedModel: savedModel };
    }

    const envModel = process.env.OLLAMA_MODEL;
    if (envModel) {
      return { selectedModel: envModel };
    }

    // Default to llama3.2:latest - a safe choice that works on most systems
    // The Settings UI will show RAM-based recommendations for the user to choose
    return { selectedModel: 'llama3.2:latest' };
  }

  /**
   * Update a specific setting
   */
  updateSetting(key: string, value: string): void {
    const db = this.getDb();
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
      recommendedModel: recommendation.recommendedModel,
      recommendedModelAlt: recommendation.altModels,
      recommendedTier: recommendation.tier,
      recommendedTierDescription: recommendation.description,
    };
  }
}

// Singleton
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(dbGetter?: () => DatabaseService): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService(dbGetter);
  }
  return settingsServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSettingsService(): void {
  settingsServiceInstance = null;
}
