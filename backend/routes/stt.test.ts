import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import fs from 'fs';
import path from 'path';

import { getSttService, resetSttService } from '../services/stt.js';

describe('STT Routes', () => {
  let app: Express;

  beforeEach(() => {
    resetSttService();
    // Point to a non-existent STT server for unit tests
    getSttService('127.0.0.1', 49997);
    app = express();
    app.use(express.raw({ type: 'audio/*', limit: '50mb' }));
    // Create inline route that uses our configured service
    app.post('/api/stt/transcribe', async (req, res) => {
      try {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('audio/')) {
          res.status(400).json({ error: 'Content-Type must be audio/wav' });
          return;
        }

        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
        if (body.length === 0) {
          res.status(400).json({ error: 'Empty request body. WAV audio data required.' });
          return;
        }

        const sttService = getSttService();
        const result = await sttService.transcribe(body);
        res.json({ text: result.text });
      } catch (error) {
        if (error instanceof Error && error.name === 'SttOfflineError') {
          res.status(503).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Transcription failed' });
        }
      }
    });

    app.get('/api/stt/health', async (_req, res) => {
      try {
        const sttService = getSttService();
        const health = await sttService.healthCheck();
        res.json(health);
      } catch {
        res.status(503).json({ error: 'STT server unreachable' });
      }
    });
  });

  afterEach(() => {
    resetSttService();
  });

  describe('POST /api/stt/transcribe - validation', () => {
    it('should return 400 when Content-Type is not audio', async () => {
      const res = await request(app)
        .post('/api/stt/transcribe')
        .set('Content-Type', 'application/json')
        .send({ data: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content-Type must be audio/wav');
    });

    it('should return 400 when Content-Type header is missing', async () => {
      const res = await request(app)
        .post('/api/stt/transcribe')
        .send(Buffer.from('test'));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content-Type must be audio/wav');
    });

    it('should return 503 when STT server is not running', async () => {
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45, // WAVE
        0x66, 0x6d, 0x74, 0x20, // fmt
        0x10, 0x00, 0x00, 0x00, // chunk size
        0x01, 0x00,             // PCM
        0x01, 0x00,             // mono
        0x80, 0x3e, 0x00, 0x00, // 16000 Hz
        0x00, 0x7d, 0x00, 0x00, // byte rate
        0x02, 0x00,             // block align
        0x10, 0x00,             // 16 bits
        0x64, 0x61, 0x74, 0x61, // data
        0x00, 0x00, 0x00, 0x00, // data size
      ]);

      const res = await request(app)
        .post('/api/stt/transcribe')
        .set('Content-Type', 'audio/wav')
        .send(wavHeader);

      expect(res.status).toBe(503);
    });
  });

  describe('GET /api/stt/health', () => {
    it('should return 503 when STT server is not running', async () => {
      const res = await request(app)
        .get('/api/stt/health');

      expect(res.status).toBe(503);
    });
  });
});

describe('STT Routes - integration (STT server running)', () => {
  let app: Express;

  beforeEach(() => {
    resetSttService();
    getSttService('127.0.0.1', 8765);
    app = express();
    app.use(express.raw({ type: 'audio/*', limit: '50mb' }));

    app.post('/api/stt/transcribe', async (req, res) => {
      try {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('audio/')) {
          res.status(400).json({ error: 'Content-Type must be audio/wav' });
          return;
        }

        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
        if (body.length === 0) {
          res.status(400).json({ error: 'Empty request body. WAV audio data required.' });
          return;
        }

        const sttService = getSttService();
        const result = await sttService.transcribe(body);
        res.json({ text: result.text });
      } catch (error) {
        if (error instanceof Error && error.name === 'SttOfflineError') {
          res.status(503).json({ error: error.message });
        } else {
          res.status(500).json({ error: (error as Error).message });
        }
      }
    });
  });

  afterEach(() => {
    resetSttService();
  });

  it('should transcribe audio when STT server is running', async () => {
    // Check if STT server is available
    const sttService = getSttService('127.0.0.1', 8765);
    const isOnline = await sttService.isOnline();

    if (!isOnline) {
      // Skip this test if STT server isn't running
      console.log('Skipping integration test: STT server not running');
      return;
    }

    // Read a test WAV file
    const testWavPath = path.join(process.cwd(), 'test-data', 'test-speech.wav');

    // Try the aigent test WAV (via symlink)
    const aigentTestWav = '/Users/stefano/repos/aigent/stt/sherpa-onnx-whisper-tiny.en/test_wavs/0.wav';

    const wavPath = fs.existsSync(testWavPath) ? testWavPath : aigentTestWav;
    if (!fs.existsSync(wavPath)) {
      console.log('Skipping integration test: no test WAV file');
      return;
    }

    const wavBuffer = fs.readFileSync(wavPath);

    const res = await request(app)
      .post('/api/stt/transcribe')
      .set('Content-Type', 'audio/wav')
      .send(wavBuffer);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('text');
    expect(res.body.text.length).toBeGreaterThan(0);
  });
});
