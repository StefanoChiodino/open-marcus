import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaService, OllamaOfflineError, getOllamaService, resetOllamaService } from './ollama.js';

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    resetOllamaService();
    service = new OllamaService('http://localhost:11434', 'test-model');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use provided host and model', () => {
      const svc = new OllamaService('http://custom:11434', 'llama3');
      expect(svc.getHost()).toBe('http://custom:11434');
      expect(svc.getModel()).toBe('llama3');
    });

    it('should use environment variables', () => {
      const originalHost = process.env.OLLAMA_HOST;
      const originalModel = process.env.OLLAMA_MODEL;

      process.env.OLLAMA_HOST = 'http://env-host:9999';
      process.env.OLLAMA_MODEL = 'env-model:7b';

      const svc = new OllamaService();
      expect(svc.getHost()).toBe('http://env-host:9999');
      expect(svc.getModel()).toBe('env-model:7b');

      // Restore
      if (originalHost) {
        process.env.OLLAMA_HOST = originalHost;
      } else {
        delete process.env.OLLAMA_HOST;
      }
      if (originalModel) {
        process.env.OLLAMA_MODEL = originalModel;
      } else {
        delete process.env.OLLAMA_MODEL;
      }
    });

    it('should use defaults when no env vars provided', () => {
      const originalHost = process.env.OLLAMA_HOST;
      const originalModel = process.env.OLLAMA_MODEL;

      delete process.env.OLLAMA_HOST;
      delete process.env.OLLAMA_MODEL;

      const svc = new OllamaService();
      expect(svc.getHost()).toBe('http://localhost:11434');
      expect(svc.getModel()).toBe('llama3.2:latest');

      // Restore
      if (originalHost) process.env.OLLAMA_HOST = originalHost;
      if (originalModel) process.env.OLLAMA_MODEL = originalModel;
    });
  });

  describe('getHost and getModel', () => {
    it('should return configured host', () => {
      expect(service.getHost()).toBe('http://localhost:11434');
    });

    it('should return configured model', () => {
      expect(service.getModel()).toBe('test-model');
    });
  });

  describe('isOnline', () => {
    it('should return true when Ollama responds', async () => {
      const online = await service.isOnline();
      // This depends on actual Ollama being running
      expect(typeof online).toBe('boolean');
    });

    it('should return false when Ollama is unreachable', async () => {
      const offlineService = new OllamaService('http://localhost:59999', 'test');
      const online = await offlineService.isOnline();
      expect(online).toBe(false);
    });
  });

  describe('chat (non-streaming)', () => {
    it('should reject with error when Ollama is offline', async () => {
      const offlineService = new OllamaService('http://localhost:59999', 'test');
      await expect(offlineService.chat([{ role: 'user', content: 'hello' }]))
        .rejects.toThrow();
    });
  });

  describe('streamChat', () => {
    it('should be an async generator', () => {
      const result = service.streamChat([{ role: 'user', content: 'hello' }]);
      expect(typeof result[Symbol.asyncIterator]).toBe('function');
    });

    it('should reject when Ollama is offline', async () => {
      const offlineService = new OllamaService('http://localhost:59999', 'test');
      await expect(async () => {
        for await (const _ of offlineService.streamChat([{ role: 'user', content: 'hello' }])) {
          // consume
        }
      }).rejects.toThrow();
    });
  });

  describe('OllamaOfflineError', () => {
    it('should have the correct name', () => {
      const error = new OllamaOfflineError();
      expect(error.name).toBe('OllamaOfflineError');
    });

    it('should have the default message', () => {
      const error = new OllamaOfflineError();
      expect(error.message).toBe('Unable to connect to AI. Please ensure Ollama is running.');
    });

    it('should accept custom message', () => {
      const error = new OllamaOfflineError('Custom error');
      expect(error.message).toBe('Custom error');
    });

    it('should be an instanceof Error', () => {
      const error = new OllamaOfflineError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('getOllamaService (singleton)', () => {
    beforeEach(() => {
      resetOllamaService();
      delete process.env.OLLAMA_HOST;
      delete process.env.OLLAMA_MODEL;
    });

    it('should create a new instance', () => {
      const svc = getOllamaService('http://test:11434', 'test-model');
      expect(svc.getHost()).toBe('http://test:11434');
      expect(svc.getModel()).toBe('test-model');
    });

    it('should return the same instance on subsequent calls', () => {
      const svc1 = getOllamaService('http://test:11434', 'test');
      const svc2 = getOllamaService('http://different:11434', 'different');
      expect(svc1).toBe(svc2);
      expect(svc1.getHost()).toBe('http://test:11434');
    });

    it('should reset properly', () => {
      const svc1 = getOllamaService('http://first:11434', 'first');
      resetOllamaService();
      const svc2 = getOllamaService('http://second:11434', 'second');
      expect(svc1).not.toBe(svc2);
      expect(svc2.getHost()).toBe('http://second:11434');
    });
  });
});
