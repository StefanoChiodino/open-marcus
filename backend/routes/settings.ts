import { Router, Request, Response } from 'express';
import { getSettingsService } from '../services/settings.js';
import { getOllamaService } from '../services/ollama.js';

const router = Router();

/**
 * Extended settings response that includes system info and installed models
 * This single endpoint provides everything the Settings page UI needs
 */
interface SettingsResponse {
  selectedModel: string;
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

    // Validate that selectedModel exists in installed models list (if Ollama is online)
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
        // If listing models fails, treat Ollama as offline and allow the update
        console.warn('Failed to verify model against installed list:', error);
      }
    }

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
