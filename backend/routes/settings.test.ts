import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import { DatabaseService } from '../db/database.js';
import { SettingsService, resetSettingsService } from '../services/settings.js';
import { getOllamaService, resetOllamaService } from '../services/ollama.js';

const testDir = './data/test-settings-routes';
const testDbPath = `${testDir}/test.db`;
const encryptionPassword = 'test-encryption-password';

/**
 * Create a test Express app with settings route mounted
 * Uses isolated test database
 */
function createApp(db: DatabaseService): express.Application {
  const app = express();
  app.use(express.json());

  // Create a settings service with the test database
  const settingsService = new SettingsService(() => db);

  // GET /api/settings
  app.get('/api/settings', async (_req, res) => {
    try {
      const systemInfo = settingsService.getSystemInfo();

      // Try to get installed models from Ollama
      let installedModels: string[] = [];
      let ollamaOnline = false;
      try {
        const ollamaService = getOllamaService();
        ollamaOnline = await ollamaService.isOnline();
        if (ollamaOnline) {
          installedModels = await ollamaService.listModels();
        }
      } catch {
        ollamaOnline = false;
      }

      res.json({
        selectedModel: settingsService.getSettings().selectedModel,
        systemInfo,
        installedModels,
        ollamaOnline,
      });
    } catch (error) {
      console.error('Error reading settings:', error);
      res.status(500).json({ error: 'Failed to read settings' });
    }
  });

  // PUT /api/settings
  app.put('/api/settings', async (req, res) => {
    try {
      const updates = req.body;

      if (typeof updates !== 'object' || updates === null) {
        res.status(400).json({ error: 'Settings body must be an object' });
        return;
      }

      if ('selectedModel' in updates && typeof updates.selectedModel !== 'string') {
        res.status(400).json({ error: 'selectedModel must be a string' });
        return;
      }

      if ('selectedModel' in updates && updates.selectedModel.trim().length === 0) {
        res.status(400).json({ error: 'selectedModel cannot be empty' });
        return;
      }

      if ('selectedModel' in updates && updates.selectedModel.trim().length > 0) {
        try {
          const ollamaService = getOllamaService();
          const isOnline = await ollamaService.isOnline();
          if (isOnline) {
            const installedModels = await ollamaService.listModels();
            if (!installedModels.includes(updates.selectedModel.trim())) {
              res.status(400).json({
                error: `Model '${updates.selectedModel}' is not installed. Available models: ${installedModels.join(', ')}`,
              });
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to verify model:', error);
        }
      }

      const updatedSettings = settingsService.updateSettings(updates);
      const systemInfo = settingsService.getSystemInfo();
      let installedModels: string[] = [];
      let ollamaOnline = false;
      try {
        const ollamaService = getOllamaService();
        ollamaOnline = await ollamaService.isOnline();
        if (ollamaOnline) {
          installedModels = await ollamaService.listModels();
        }
      } catch {
        ollamaOnline = false;
      }

      res.json({
        selectedModel: updatedSettings.selectedModel,
        systemInfo,
        installedModels,
        ollamaOnline,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // GET /api/settings/ollama/models
  app.get('/api/settings/ollama/models', async (_req, res) => {
    try {
      const ollamaService = getOllamaService();
      const isOnline = await ollamaService.isOnline();
      if (!isOnline) {
        res.status(503).json({
          error: 'Unable to connect to AI. Please ensure Ollama is running.',
          models: [],
          ollamaOnline: false,
        });
        return;
      }
      const models = await ollamaService.listModels();
      res.json({ models, ollamaOnline: true });
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      const message = error instanceof Error ? error.message : 'Failed to list models';
      res.status(500).json({ error: message, models: [], ollamaOnline: false });
    }
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

describe('Settings Routes', () => {
  let app: express.Application;
  let db: DatabaseService;

  beforeEach(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create isolated test database
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetSettingsService();
    resetOllamaService();

    app = createApp(db);

    // Mock Ollama isOnline and listModels for route tests
    const mockOllamaService = getOllamaService();
    vi.spyOn(mockOllamaService, 'isOnline').mockResolvedValue(true);
    vi.spyOn(mockOllamaService, 'listModels').mockResolvedValue([
      'llama3.2:latest',
      'llama3.2:3b',
      'qwen2.5:7b',
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      db.close();
    } catch {}
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe('GET /api/settings', () => {
    it('should return settings with system info and installed models', async () => {
      const response = await request(app).get('/api/settings').expect(200);

      expect(response.body).toHaveProperty('selectedModel');
      expect(response.body).toHaveProperty('systemInfo');
      expect(response.body).toHaveProperty('installedModels');
      expect(response.body).toHaveProperty('ollamaOnline');

      expect(response.body.systemInfo.totalRamGB).toBeGreaterThan(0);
      expect(response.body.installedModels).toContain('llama3.2:latest');
      expect(response.body.ollamaOnline).toBe(true);
    });

    it('should handle Ollama being offline gracefully', async () => {
      const mockOllamaService = getOllamaService();
      vi.spyOn(mockOllamaService, 'isOnline').mockResolvedValue(false);

      const response = await request(app).get('/api/settings').expect(200);

      expect(response.body.ollamaOnline).toBe(false);
      expect(response.body.installedModels).toEqual([]);
    });
  });

  describe('PUT /api/settings', () => {
    it('should update selectedModel', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'qwen2.5:7b' })
        .expect(200);

      expect(response.body.selectedModel).toBe('qwen2.5:7b');
    });

    it('should persist the updated model', async () => {
      // First update - using a model that's in the installed models list
      await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'qwen2.5:7b' })
        .expect(200);

      // Then verify it persists on next GET
      const getResponse = await request(app).get('/api/settings').expect(200);
      expect(getResponse.body.selectedModel).toBe('qwen2.5:7b');
    });

    it('should return 400 for empty selectedModel', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: '' })
        .expect(400);

      expect(response.body.error).toContain('empty');
    });

    it('should return 400 for non-string selectedModel', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 123 })
        .expect(400);

      expect(response.body.error).toContain('string');
    });

    it('should return 400 for non-object body', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send('not an object')
        .expect(400);

      expect(response.body.error).toContain('object');
    });

    it('should return 400 when selectedModel is not in installed models list', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'nonexistent:model' })
        .expect(400);

      expect(response.body.error).toContain('not installed');
      expect(response.body.error).toContain('nonexistent:model');
    });

    it('should allow update when selectedModel is in installed models list', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'llama3.2:latest' })
        .expect(200);

      expect(response.body.selectedModel).toBe('llama3.2:latest');
    });

    it('should allow update when Ollama is offline (cannot verify installed models)', async () => {
      const mockOllamaService = getOllamaService();
      vi.spyOn(mockOllamaService, 'isOnline').mockResolvedValue(false);

      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'any-model:works' })
        .expect(200);

      expect(response.body.selectedModel).toBe('any-model:works');
    });
  });

  describe('GET /api/settings/ollama/models', () => {
    it('should return list of installed models when Ollama online', async () => {
      const response = await request(app)
        .get('/api/settings/ollama/models')
        .expect(200);

      expect(response.body.ollamaOnline).toBe(true);
      expect(response.body.models).toContain('llama3.2:latest');
      expect(response.body.models).toContain('llama3.2:3b');
      expect(response.body.models).toContain('qwen2.5:7b');
    });

    it('should return 503 when Ollama is offline', async () => {
      const mockOllamaService = getOllamaService();
      vi.spyOn(mockOllamaService, 'isOnline').mockResolvedValue(false);

      const response = await request(app)
        .get('/api/settings/ollama/models')
        .expect(503);

      expect(response.body.ollamaOnline).toBe(false);
      expect(response.body.models).toEqual([]);
      expect(response.body.error).toContain('Ollama');
    });
  });
});
