import { Router, Request, Response } from 'express';
import { getSttService, SttOfflineError } from '../services/stt.js';

const router = Router();

/**
 * POST /api/stt/transcribe
 *
 * Transcribes WAV audio to text using the sherpa-onnx Whisper STT server.
 *
 * Request:
 *   Content-Type: audio/wav
 *   Body: raw WAV bytes (16kHz mono 16-bit PCM)
 *
 * Response:
 *   200: { "text": "..." }
 *   400: { "error": "..." } - Missing or invalid audio data
 *   503: { "error": "..." } - STT server is not running
 *   500: { "error": "..." } - Transcription failed
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    // Check Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('audio/')) {
      res.status(400).json({ error: 'Content-Type must be audio/wav' });
      return;
    }

    // Raw body is populated by express.raw() middleware in server.ts
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

    if (body.length === 0) {
      res.status(400).json({ error: 'Empty request body. WAV audio data required.' });
      return;
    }

    const sttService = getSttService();
    const result = await sttService.transcribe(body);

    res.json({ text: result.text });
  } catch (error) {
    console.error('STT transcribe error:', error);
    if (error instanceof SttOfflineError) {
      res.status(503).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Transcription failed' });
    }
  }
});

/**
 * GET /api/stt/health
 *
 * Returns the health status of the STT server.
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const sttService = getSttService();
    const health = await sttService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(503).json({ error: 'STT server unreachable' });
  }
});

export default router;
