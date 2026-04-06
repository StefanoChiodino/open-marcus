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
      delete process.env.OLLAMA_MODEL;

      // Reset to get fresh instance
      resetSettingsService();
      const tempService = new SettingsService();
      const settings = tempService.getSettings();
      expect(settings.selectedModel).toBe('llama3.2:latest');

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
      expect(info.recommendedModelSize).toBeTruthy();
      expect(info.recommendedModelDescription).toBeTruthy();
    });

    it('should recommend 3b model for < 16 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(8 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedModelSize).toBe('3b');
      expect(info.recommendedModelDescription).toContain('3B');
    });

    it('should recommend 7b model for 16-31 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(16 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedModelSize).toBe('7b');
    });

    it('should recommend 14b model for 32-63 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(32 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedModelSize).toBe('14b');
    });

    it('should recommend 70b model for 64+ GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(64 * 1024 * 1024 * 1024);

      resetSettingsService();
      const freshService = new SettingsService();
      const info = freshService.getSystemInfo();
      expect(info.recommendedModelSize).toBe('70b');
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
