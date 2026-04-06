import { Router, Request, Response } from 'express';
import { getSettingsService, TTS_VOICES, TTS_MIN_RATE, TTS_MAX_RATE, TTS_MIN_PITCH, TTS_MAX_PITCH } from '../services/settings.js';
import { getOllamaService } from '../services/ollama.js';

const router = Router();

/**
 * Extended settings response that includes system info and installed models
 * This single endpoint provides everything the Settings page UI needs
 */
interface SettingsResponse {
  selectedModel: string;
  ttsVoice: string;
  ttsRate: string;
  ttsPitch: string;
  systemInfo: {
    totalRamGB: number;
    recommendedModel: string;
    recommendedModelAlt: string[];
    recommendedTier: string;
    recommendedTierDescription: string;
  } | null;
  installedModels: string[];
  ollamaOnline: boolean;
}

/**
 * GET /api/settings
 *
 * Returns settings, system info, and installed Ollama models
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const settingsService = getSettingsService();
    const settings = settingsService.getSettings();
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
      // Ollama is offline - installedModels stays empty
      ollamaOnline = false;
    }

    const response: SettingsResponse = {
      selectedModel: settings.selectedModel,
      ttsVoice: settings.ttsVoice,
      ttsRate: settings.ttsRate,
      ttsPitch: settings.ttsPitch,
      systemInfo,
      installedModels,
      ollamaOnline,
    };

    res.json(response);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

/**
 * PUT /api/settings
 *
 * Updates application settings. When selectedModel changes,
 * updates the OllamaService singleton.
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    if (typeof updates !== 'object' || updates === null) {
      res.status(400).json({ error: 'Settings body must be an object' });
      return;
    }

    // Validate selectedModel if provided
    if ('selectedModel' in updates && typeof updates.selectedModel !== 'string') {
      res.status(400).json({ error: 'selectedModel must be a string' });
      return;
    }

    // Validate that selectedModel is not empty
    if ('selectedModel' in updates && updates.selectedModel.trim().length === 0) {
      res.status(400).json({ error: 'selectedModel cannot be empty' });
      return;
    }

    // Validate ttsVoice if provided
    if ('ttsVoice' in updates) {
      if (typeof updates.ttsVoice !== 'string') {
        res.status(400).json({ error: 'ttsVoice must be a string' });
        return;
      }
      if (!TTS_VOICES.includes(updates.ttsVoice as typeof TTS_VOICES[number])) {
        res.status(400).json({
          error: `ttsVoice must be one of: ${TTS_VOICES.join(', ')}`,
        });
        return;
      }
    }

    // Validate ttsRate if provided
    if ('ttsRate' in updates) {
      if (typeof updates.ttsRate !== 'string') {
        res.status(400).json({ error: 'ttsRate must be a string' });
        return;
      }
      // Parse rate from string like "+25%" or "-10%"
      const rateMatch = updates.ttsRate.match(/^([+-]?\d+)%$/);
      if (!rateMatch) {
        res.status(400).json({ error: 'ttsRate must be a percentage string like "+25%" or "-10%"' });
        return;
      }
      const rateValue = parseInt(rateMatch[1], 10);
      if (rateValue < TTS_MIN_RATE || rateValue > TTS_MAX_RATE) {
        res.status(400).json({ error: `ttsRate must be between ${TTS_MIN_RATE}% and ${TTS_MAX_RATE}%` });
        return;
      }
    }

    // Validate ttsPitch if provided
    if ('ttsPitch' in updates) {
      if (typeof updates.ttsPitch !== 'string') {
        res.status(400).json({ error: 'ttsPitch must be a string' });
        return;
      }
      // Parse pitch from string like "+0Hz" or "-10Hz"
      const pitchMatch = updates.ttsPitch.match(/^([+-]?\d+)Hz$/);
      if (!pitchMatch) {
        res.status(400).json({ error: 'ttsPitch must be a Hz string like "+0Hz" or "-10Hz"' });
        return;
      }
      const pitchValue = parseInt(pitchMatch[1], 10);
      if (pitchValue < TTS_MIN_PITCH || pitchValue > TTS_MAX_PITCH) {
        res.status(400).json({ error: `ttsPitch must be between ${TTS_MIN_PITCH}Hz and ${TTS_MAX_PITCH}Hz` });
        return;
      }
    }

    // Note: We don't validate that selectedModel exists in installed models here.
    // If the model isn't installed, Ollama will return an error at chat time which the UI handles gracefully.
    // This allows users to pre-select a recommended model before installing it.

    const settingsService = getSettingsService();
    const updatedSettings = settingsService.updateSettings(updates);

    // If model changed, update the OllamaService singleton
    if (updates.selectedModel) {
      const ollamaService = getOllamaService();
      ollamaService.setModel(updates.selectedModel);
    }

    // Return full response with updated data
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

    const response: SettingsResponse = {
      selectedModel: updatedSettings.selectedModel,
      ttsVoice: updatedSettings.ttsVoice,
      ttsRate: updatedSettings.ttsRate,
      ttsPitch: updatedSettings.ttsPitch,
      systemInfo,
      installedModels,
      ollamaOnline,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/ollama/models
 *
 * Returns the list of installed Ollama models
 */
router.get('/ollama/models', async (_req: Request, res: Response) => {
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

export { router as settingsRouter };
export default router;
