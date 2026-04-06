/**
 * Tests for Settings service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'node:os';
import * as fs from 'fs';
import { SettingsService, getSettingsService, resetSettingsService, TTS_VOICES } from './settings.js';
import { DatabaseService } from '../db/database.js';

const testDir = './data/test-settings';
const testDbPath = `${testDir}/test.db`;
const encryptionPassword = 'test-encryption-password';

describe('SettingsService', () => {
  let service: SettingsService;
  let db: DatabaseService;

  beforeEach(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create isolated test database
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetSettingsService();
    service = new SettingsService(() => db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      db.close();
    } catch {}
    // Clean up test database
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('getSettings', () => {
    it('should return environment variable model when no setting exists', () => {
      const originalModel = process.env.OLLAMA_MODEL;
      process.env.OLLAMA_MODEL = 'custom-model:7b';

      const tempService = new SettingsService(() => db);
      const settings = tempService.getSettings();
      expect(settings.selectedModel).toBe('custom-model:7b');

      if (originalModel) {
        process.env.OLLAMA_MODEL = originalModel;
      } else {
        delete process.env.OLLAMA_MODEL;
      }
    });

    it('should return default when no setting or env var exists', () => {
      const originalModel = process.env.OLLAMA_MODEL;
      delete process.env.OLLAMA_MODEL;

      const tempService = new SettingsService(() => db);
      const settings = tempService.getSettings();
      // Should be llama3.2:latest as the safe default
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
      expect(info.recommendedModel).toBeTruthy();
      expect(info.recommendedTier).toBeTruthy();
      expect(info.recommendedTierDescription).toBeTruthy();
      expect(info.recommendedModelAlt).toBeInstanceOf(Array);
    });

    it('should recommend 2b model for < 4 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(2 * 1024 * 1024 * 1024);

      const freshService = new SettingsService(() => db);
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('2b');
      expect(info.recommendedModel).toBe('gemma4:2b');
    });

    it('should recommend 4b model for 4-7 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(6 * 1024 * 1024 * 1024);

      const freshService = new SettingsService(() => db);
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('4b');
      expect(info.recommendedModel).toBe('gemma4:4b');
    });

    it('should recommend 26b-a4b MoE model for 8-15 GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(8 * 1024 * 1024 * 1024);

      const freshService = new SettingsService(() => db);
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('26b-a4b');
      expect(info.recommendedModel).toBe('gemma4:26b-a4b');
    });

    it('should recommend 27b-31b model for 16+ GB RAM', () => {
      vi.spyOn(os, 'totalmem').mockReturnValue(32 * 1024 * 1024 * 1024);

      const freshService = new SettingsService(() => db);
      const info = freshService.getSystemInfo();
      expect(info.recommendedTier).toBe('27b-31b');
      expect(info.recommendedModel).toBe('gemma4:31b');
    });
  });

  describe('TTS settings', () => {
    it('should return default TTS settings when none saved', () => {
      const settings = service.getSettings();
      expect(settings.ttsVoice).toBe('en-US-GuyNeural');
      expect(settings.ttsRate).toBe('+25%');
      expect(settings.ttsPitch).toBe('+0Hz');
    });

    it('should save and retrieve TTS voice', () => {
      service.updateSettings({ ttsVoice: 'en-US-JennyNeural' });
      const settings = service.getSettings();
      expect(settings.ttsVoice).toBe('en-US-JennyNeural');
    });

    it('should save and retrieve TTS rate', () => {
      service.updateSettings({ ttsRate: '+50%' });
      const settings = service.getSettings();
      expect(settings.ttsRate).toBe('+50%');
    });

    it('should save and retrieve TTS pitch', () => {
      service.updateSettings({ ttsPitch: '-20Hz' });
      const settings = service.getSettings();
      expect(settings.ttsPitch).toBe('-20Hz');
    });

    it('should update multiple TTS settings at once', () => {
      service.updateSettings({
        ttsVoice: 'en-GB-ThomasNeural',
        ttsRate: '-10%',
        ttsPitch: '+10Hz',
      });
      const settings = service.getSettings();
      expect(settings.ttsVoice).toBe('en-GB-ThomasNeural');
      expect(settings.ttsRate).toBe('-10%');
      expect(settings.ttsPitch).toBe('+10Hz');
    });

    it('should persist TTS settings across service instances', () => {
      service.updateSettings({
        ttsVoice: 'en-US-ChristopherNeural',
        ttsRate: '+100%',
        ttsPitch: '-50Hz',
      });

      const freshService = new SettingsService(() => db);
      const settings = freshService.getSettings();
      expect(settings.ttsVoice).toBe('en-US-ChristopherNeural');
      expect(settings.ttsRate).toBe('+100%');
      expect(settings.ttsPitch).toBe('-50Hz');
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
