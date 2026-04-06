/**
 * Tests for Settings service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import { SettingsService, getSettingsService, resetSettingsService } from './settings.js';
import { getDatabase } from '../db/database.js';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    resetSettingsService();
    service = new SettingsService();

    // Ensure database is initialized (runs migrations)
    getDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should return environment variable model when no setting exists', () => {
      // Clear any persisted model setting (DB singleton persists between tests)
      const db = getDatabase();
      db.deleteSetting('ollama.model');

      const originalModel = process.env.OLLAMA_MODEL;
      process.env.OLLAMA_MODEL = 'custom-model:7b';

      // Reset to get fresh instance
      resetSettingsService();
      const tempService = new SettingsService();
      const settings = tempService.getSettings();
      expect(settings.selectedModel).toBe('custom-model:7b');

      if (originalModel) {
        process.env.OLLAMA_MODEL = originalModel;
      } else {
        delete process.env.OLLAMA_MODEL;
      }
    });

    it('should return RAM-based default when no setting or env var exists', () => {
      // Clear any persisted model setting (DB singleton persists between tests)
      const db = getDatabase();
      db.deleteSetting('ollama.model');

      const originalModel = process.env.OLLAMA_MODEL;
      delete process.env.OLLAMA_MODEL;

      // Reset to get fresh instance
      resetSettingsService();
      const tempService = new SettingsService();
      const settings = tempService.getSettings();
      // Should be RAM-based default (gemma4:26b-a4b for 8GB+ typical systems)
      expect(settings.selectedModel).toMatch(/^gemma4:|^qwen3\.5:|^llama3\.2:/);

      if (originalModel) process.env.OLLAMA_MODEL = originalModel;
    });
  });

  describe('updateSetting', () => {
    it('should save and retrieve a setting', () => {
      service.updateSetting('ollama.model', 'qwen2.5:7b');

      const settings = service.getSettings();
      expect(settings.selectedModel).toBe('qwen2.5:7b');
    });

    it('should overwrite existing settings', () => {
      service.updateSetting('ollama.model', 'first-model');
      service.updateSetting('ollama.model', 'second-model');

      const settings = service.getSettings();
      expect(settings.selectedModel).toBe('second-model');
    });
  });

  describe('updateSettings', () => {
    it('should update selectedModel', () => {
      const result = service.updateSettings({ selectedModel: 'qwen2.5:3b' });
      expect(result.selectedModel).toBe('qwen2.5:3b');
    });
  });

  describe('getSystemInfo', () => {
    it('should return system info with total RAM', () => {
      const info = service.getSystemInfo();
      expect(info.totalRamGB).toBeGreaterThan(0);
      expect(typeof info.totalRamGB).toBe('number');
      expect(info.recommendedModel).toBeTruthy();
      expect(info.recommendedTier).toBeTruthy();
      expect(info.recommendedTierDescription).toBeTruthy();
      expect(info.recommendedModelAlt).toBeInstanceOf(Array);
    });

    it('should recommend 2b model for < 4 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(2 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('2b');
      expect(info.recommendedModel).toBe('gemma4:2b');
    });

    it('should recommend 4b model for 4-7 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(6 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('4b');
      expect(info.recommendedModel).toBe('gemma4:4b');
    });

    it('should recommend 26b-a4b MoE model for 8-15 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(8 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('26b-a4b');
      expect(info.recommendedModel).toBe('gemma4:26b-a4b');
    });

    it('should recommend 27b-31b model for 16+ GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(32 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('27b-31b');
      expect(info.recommendedModel).toBe('gemma4:31b');
    });
  });

  describe('singleton', () => {
    beforeEach(() => {
      resetSettingsService();
    });

    it('should return same instance from getSettingsService', () => {
      const s1 = getSettingsService();
      const s2 = getSettingsService();
      expect(s1).toBe(s2);
    });

    it('should reset properly', () => {
      const s1 = getSettingsService();
      resetSettingsService();
      const s2 = getSettingsService();
      expect(s1).not.toBe(s2);
    });
  });
});
