import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import settingsRouter from './settings.js';
import { resetSettingsService } from '../services/settings.js';
import { getOllamaService, resetOllamaService } from '../services/ollama.js';
import { getDatabase } from '../db/database.js';

/**
 * Create a test Express app with settings route mounted
 */
function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/settings', settingsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

describe('Settings Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    resetSettingsService();
    resetOllamaService();

    // Ensure database is initialized (runs migrations including settings table)
    getDatabase();

    app = createApp();

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
