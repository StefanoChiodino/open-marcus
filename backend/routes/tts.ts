import { Router, Request, Response } from 'express';
import { getTtsService, TtsOfflineError } from '../services/tts.js';

const router = Router();

/**
 * POST /api/tts/synthesize
 *
 * Synthesizes text to MP3 audio using the edge-tts TTS server.
 *
 * Request:
 *   Content-Type: application/json
 *   Body: { "text": "Hello world", "voice?: string, "rate"?: string, "pitch"?: string }
 *   - text (required): Text to synthesize
 *   - voice (optional): Override voice (e.g., "en-US-GuyNeural")
 *   - rate (optional): Override speech rate (e.g., "+25%")
 *   - pitch (optional): Override pitch (e.g., "+2Hz")
 *
 * Response:
 *   200: audio/mpeg (MP3 data)
 *   400: { "error": "..." } - Missing or invalid text
 *   503: { "error": "..." } - TTS server is not running
 *   500: { "error": "..." } - Synthesis failed
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voice, rate, pitch } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text is required and must be non-empty' });
      return;
    }

    const ttsService = getTtsService();
    const result = await ttsService.synthesize(text.trim(), { voice, rate, pitch });

    res.set('Content-Type', result.contentType);
    res.send(result.audio);
  } catch (error) {
    console.error('TTS synthesize error:', error);
    if (error instanceof TtsOfflineError) {
      res.status(503).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Speech synthesis failed' });
    }
  }
});

/**
 * GET /api/tts/voices
 *
 * Returns the list of available voices from the TTS server.
 *
 * Response:
 *   200: { "voices": Array<{name, locale, gender}> }
 *   503: { "error": "..." } - TTS server is not running
 */
router.get('/voices', async (_req: Request, res: Response) => {
  try {
    const ttsService = getTtsService();
    const voices = await ttsService.getVoices();
    res.json({ voices });
  } catch (error) {
    console.error('TTS voices error:', error);
    res.status(503).json({ error: 'Failed to fetch voices' });
  }
});

/**
 * GET /api/tts/health
 *
 * Returns the health status of the TTS server.
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const ttsService = getTtsService();
    const health = await ttsService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(503).json({ error: 'TTS server unreachable' });
  }
});

export default router;
