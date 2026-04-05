import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';

import { getTtsService, resetTtsService } from '../services/tts.js';
import ttsRoutes from './tts.js';

describe('TTS Routes', () => {
  let app: Express;

  beforeEach(() => {
    resetTtsService();
    // Point to a non-existent TTS server for unit tests
    getTtsService('127.0.0.1', 49998);
    app = express();
    app.use(express.json());
    app.use('/api/tts', ttsRoutes);
  });

  afterEach(() => {
    resetTtsService();
  });

  describe('POST /api/tts/synthesize - validation', () => {
    it('should return 400 when text is empty', async () => {
      const res = await request(app)
        .post('/api/tts/synthesize')
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Text is required');
    });

    it('should return 400 when text is missing', async () => {
      const res = await request(app)
        .post('/api/tts/synthesize')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Text is required');
    });

    it('should return 400 when text is not a string', async () => {
      const res = await request(app)
        .post('/api/tts/synthesize')
        .send({ text: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Text is required');
    });

    it('should return 503 when TTS server is not running', async () => {
      const res = await request(app)
        .post('/api/tts/synthesize')
        .send({ text: 'Hello world' });

      expect(res.status).toBe(503);
    });

    it('should return 503 when text is whitespace only', async () => {
      const res = await request(app)
        .post('/api/tts/synthesize')
        .send({ text: '   ' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tts/voices', () => {
    it('should return 503 when TTS server is not running', async () => {
      const res = await request(app)
        .get('/api/tts/voices');

      expect(res.status).toBe(503);
    });
  });

  describe('GET /api/tts/health', () => {
    it('should return 503 when TTS server is not running', async () => {
      const res = await request(app)
        .get('/api/tts/health');

      expect(res.status).toBe(503);
    });
  });
});

describe('TTS Routes - integration (TTS server running)', () => {
  let app: Express;

  beforeEach(() => {
    resetTtsService();
    getTtsService('127.0.0.1', 8766);
    app = express();
    app.use(express.json());
    app.use('/api/tts', ttsRoutes);
  });

  afterEach(() => {
    resetTtsService();
  });

  it('should synthesize audio when TTS server is running', async () => {
    // Check if TTS server is available
    const ttsService = getTtsService('127.0.0.1', 8766);
    const isOnline = await ttsService.isOnline();

    if (!isOnline) {
      console.log('Skipping integration test: TTS server not running');
      return;
    }

    const res = await request(app)
      .post('/api/tts/synthesize')
      .send({ text: 'Hello world' });

    expect(res.status).toBe(200);
    expect(res.type).toEqual('audio/mpeg');
    expect(res.body.byteLength).toBeGreaterThan(0);
  });

  it('should fetch voices when TTS server is running', async () => {
    const ttsService = getTtsService('127.0.0.1', 8766);
    const isOnline = await ttsService.isOnline();

    if (!isOnline) {
      console.log('Skipping integration test: TTS server not running');
      return;
    }

    const res = await request(app)
      .get('/api/tts/voices');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('voices');
    expect(Array.isArray(res.body.voices)).toBe(true);
    expect(res.body.voices.length).toBeGreaterThan(0);
  });
});
