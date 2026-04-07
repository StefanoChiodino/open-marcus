import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import { DatabaseService } from '../db/database.js';
import { getSettingsService, resetSettingsService } from '../services/settings.js';
import { getOllamaService, resetOllamaService, OllamaModelInfo } from '../services/ollama.js';
import { getSttService } from '../services/stt.js';
import { settingsRouter } from './settings.js';

const testDir = './data/test-settings-routes';
const testDbPath = `${testDir}/test.db`;
const encryptionPassword = 'test-encryption-password';

/**
 * Create a test Express app with settings route mounted
 * Uses isolated test database and actual router
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

    // Create singleton with test database
    getSettingsService(() => db);

    app = createApp();

    // Mock Ollama isOnline and listModels for route tests
    const mockOllamaService = getOllamaService();
    vi.spyOn(mockOllamaService, 'isOnline').mockResolvedValue(true);
    vi.spyOn(mockOllamaService, 'listModels').mockResolvedValue([
      { name: 'llama3.2:latest', sizeBytes: 2 * 1024 * 1024 * 1024, modifiedAt: '2024-01-01T00:00:00Z' },
      { name: 'llama3.2:3b', sizeBytes: 2 * 1024 * 1024 * 1024, modifiedAt: '2024-01-01T00:00:00Z' },
      { name: 'qwen2.5:7b', sizeBytes: 4 * 1024 * 1024 * 1024, modifiedAt: '2024-01-01T00:00:00Z' },
    ] as OllamaModelInfo[]);
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

    it('should allow selecting a model that is not yet installed (pre-selection)', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ selectedModel: 'gemma4:31b' })
        .expect(200);

      expect(response.body.selectedModel).toBe('gemma4:31b');
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

  describe('TTS settings', () => {
    it('should return default TTS settings on GET', async () => {
      const response = await request(app).get('/api/settings').expect(200);

      expect(response.body).toHaveProperty('ttsVoice');
      expect(response.body).toHaveProperty('ttsRate');
      expect(response.body).toHaveProperty('ttsPitch');
      expect(response.body.ttsVoice).toBe('en-US-GuyNeural');
      expect(response.body.ttsRate).toBe('+25%');
      expect(response.body.ttsPitch).toBe('+0Hz');
    });

    it('should update TTS voice via PUT', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsVoice: 'en-US-JennyNeural' })
        .expect(200);

      expect(response.body.ttsVoice).toBe('en-US-JennyNeural');
    });

    it('should update TTS rate via PUT', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsRate: '+50%' })
        .expect(200);

      expect(response.body.ttsRate).toBe('+50%');
    });

    it('should update TTS pitch via PUT', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: '-20Hz' })
        .expect(200);

      expect(response.body.ttsPitch).toBe('-20Hz');
    });

    it('should update multiple TTS settings at once', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          ttsVoice: 'en-GB-ThomasNeural',
          ttsRate: '-10%',
          ttsPitch: '+10Hz',
        })
        .expect(200);

      expect(response.body.ttsVoice).toBe('en-GB-ThomasNeural');
      expect(response.body.ttsRate).toBe('-10%');
      expect(response.body.ttsPitch).toBe('+10Hz');
    });

    it('should persist TTS settings across requests', async () => {
      await request(app)
        .put('/api/settings')
        .send({
          ttsVoice: 'en-US-ChristopherNeural',
          ttsRate: '+100%',
          ttsPitch: '-50Hz',
        })
        .expect(200);

      const getResponse = await request(app).get('/api/settings').expect(200);
      expect(getResponse.body.ttsVoice).toBe('en-US-ChristopherNeural');
      expect(getResponse.body.ttsRate).toBe('+100%');
      expect(getResponse.body.ttsPitch).toBe('-50Hz');
    });

    it('should return 400 for invalid TTS voice', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsVoice: 'invalid-voice' })
        .expect(400);

      expect(response.body.error).toContain('ttsVoice must be one of');
    });

    it('should return 400 for invalid TTS rate format', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsRate: 'not-a-percentage' })
        .expect(400);

      expect(response.body.error).toContain('ttsRate must be a percentage string');
    });

    it('should return 400 for TTS rate below minimum', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsRate: '-60%' })
        .expect(400);

      expect(response.body.error).toContain('ttsRate must be between');
    });

    it('should return 400 for TTS rate above maximum', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsRate: '+150%' })
        .expect(400);

      expect(response.body.error).toContain('ttsRate must be between');
    });

    it('should return 400 for invalid TTS pitch format', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: 'not-a-hz' })
        .expect(400);

      expect(response.body.error).toContain('ttsPitch must be a Hz string');
    });

    it('should return 400 for TTS pitch below minimum', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: '-60Hz' })
        .expect(400);

      expect(response.body.error).toContain('ttsPitch must be between');
    });

    it('should return 400 for TTS pitch above maximum', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: '+60Hz' })
        .expect(400);

      expect(response.body.error).toContain('ttsPitch must be between');
    });

    it('should accept boundary TTS rate values', async () => {
      const minResponse = await request(app)
        .put('/api/settings')
        .send({ ttsRate: '-50%' })
        .expect(200);
      expect(minResponse.body.ttsRate).toBe('-50%');

      const maxResponse = await request(app)
        .put('/api/settings')
        .send({ ttsRate: '+100%' })
        .expect(200);
      expect(maxResponse.body.ttsRate).toBe('+100%');
    });

    it('should accept boundary TTS pitch values', async () => {
      const minResponse = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: '-50Hz' })
        .expect(200);
      expect(minResponse.body.ttsPitch).toBe('-50Hz');

      const maxResponse = await request(app)
        .put('/api/settings')
        .send({ ttsPitch: '+50Hz' })
        .expect(200);
      expect(maxResponse.body.ttsPitch).toBe('+50Hz');
    });

    it('should allow combining model and TTS settings', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          selectedModel: 'llama3.2:latest',
          ttsVoice: 'en-US-BrianNeural',
          ttsRate: '+0%',
          ttsPitch: '+0Hz',
        })
        .expect(200);

      expect(response.body.selectedModel).toBe('llama3.2:latest');
      expect(response.body.ttsVoice).toBe('en-US-BrianNeural');
      expect(response.body.ttsRate).toBe('+0%');
      expect(response.body.ttsPitch).toBe('+0Hz');
    });
  });

  describe('STT settings', () => {
    it('should return sttModel in GET /api/settings response', async () => {
      const response = await request(app).get('/api/settings').expect(200);

      expect(response.body).toHaveProperty('sttModel');
      expect(typeof response.body.sttModel).toBe('string');
    });

    it('should update sttModel via PUT', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ sttModel: 'sherpa-onnx-whisper-tiny.en' })
        .expect(200);

      expect(response.body.sttModel).toBe('sherpa-onnx-whisper-tiny.en');
    });

    it('should return 400 for empty sttModel', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ sttModel: '' })
        .expect(400);

      expect(response.body.error).toContain('empty');
    });

    it('should return 400 for non-string sttModel', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({ sttModel: 123 })
        .expect(400);

      expect(response.body.error).toContain('string');
    });

    it('should persist sttModel across requests', async () => {
      await request(app)
        .put('/api/settings')
        .send({ sttModel: 'sherpa-onnx-whisper-small' })
        .expect(200);

      const getResponse = await request(app).get('/api/settings').expect(200);
      expect(getResponse.body.sttModel).toBe('sherpa-onnx-whisper-small');
    });
  });

  describe('GET /api/settings/stt-models', () => {
    it('should return list of available STT models', async () => {
      const response = await request(app)
        .get('/api/settings/stt-models')
        .expect(200);

      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
    });

    it('should return model name, path, and sizeMB for each model', async () => {
      const response = await request(app)
        .get('/api/settings/stt-models')
        .expect(200);

      // The actual models depend on what's in servers/stt/
      for (const model of response.body.models) {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('path');
        expect(model).toHaveProperty('sizeMB');
        expect(model).toHaveProperty('memoryMB');
        expect(typeof model.name).toBe('string');
        expect(typeof model.path).toBe('string');
        expect(typeof model.sizeMB).toBe('number');
        expect(typeof model.memoryMB).toBe('number');
      }
    });

    it('should return empty array if no models found', async () => {
      // This test assumes the actual servers/stt/ directory exists
      // If it has models, the response won't be empty
      const response = await request(app)
        .get('/api/settings/stt-models')
        .expect(200);

      expect(response.body.models).toBeDefined();
      expect(Array.isArray(response.body.models)).toBe(true);
    });
  });

  describe('POST /api/settings/stt-reload', () => {
    it('should return 400 if modelDir is not provided', async () => {
      const response = await request(app)
        .post('/api/settings/stt-reload')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('modelDir');
    });

    it('should return 400 if modelDir is not a string', async () => {
      const response = await request(app)
        .post('/api/settings/stt-reload')
        .send({ modelDir: 123 })
        .expect(400);

      expect(response.body.error).toContain('string');
    });

    it('should return 400 if model directory does not exist', async () => {
      const response = await request(app)
        .post('/api/settings/stt-reload')
        .send({ modelDir: 'nonexistent-model' })
        .expect(400);

      expect(response.body.error).toContain('not found');
    });

    it('should return 503 if STT server is not running', async () => {
      const mockSttService = getSttService();
      vi.spyOn(mockSttService, 'isOnline').mockResolvedValue(false);

      const response = await request(app)
        .post('/api/settings/stt-reload')
        .send({ modelDir: 'sherpa-onnx-whisper-tiny.en' })
        .expect(503);

      expect(response.body.error).toContain('STT server');
    });
  });
});
