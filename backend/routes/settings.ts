import { Router, Request, Response } from 'express';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getSettingsService, TTS_VOICES, TTS_MIN_RATE, TTS_MAX_RATE, TTS_MIN_PITCH, TTS_MAX_PITCH } from '../services/settings.js';
import { getOllamaService, OllamaModelInfo } from '../services/ollama.js';
import { getSttService, SttOfflineError } from '../services/stt.js';

const router = Router();

/**
 * Extended settings response that includes system info and installed models
 * This single endpoint provides everything the Settings page UI needs
 */
export interface ModelInfo {
  name: string;
  sizeBytes: number;
  /** Human-readable size string, e.g., "1.2 GB" */
  sizeLabel: string;
  /** Estimated RAM usage when loaded (includes overhead), e.g., "~2 GB" */
  ramUsageLabel: string;
}

interface SettingsResponse {
  selectedModel: string;
  ttsVoice: string;
  ttsRate: string;
  ttsPitch: string;
  sttModel: string;
  systemInfo: {
    totalRamGB: number;
    recommendedModel: string;
    recommendedModelAlt: string[];
    recommendedTier: string;
    recommendedTierDescription: string;
  } | null;
  installedModels: string[];
  /** Installed models with size information for RAM display */
  installedModelsInfo: ModelInfo[];
  /** Recommended models not yet installed, with estimated RAM */
  recommendedModelsInfo: ModelInfo[];
  ollamaOnline: boolean;
}

/**
 * Convert bytes to human-readable size label
 */
function formatSizeLabel(bytes: number): string {
  if (bytes === 0) return 'Unknown size';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

/**
 * Estimate RAM usage from model size.
 * Ollama models are compressed on disk but decompress into RAM during inference.
 * Rule of thumb: RAM usage is roughly 2x the on-disk size for most models,
 * accounting for: model weights, KV cache, activations, and runtime overhead.
 */
function estimateRamUsage(modelSizeBytes: number): string {
  if (modelSizeBytes === 0) return 'Unknown RAM';
  const sizeGB = modelSizeBytes / (1024 * 1024 * 1024);
  // Estimate RAM as approximately 2x disk size
  const ramGB = sizeGB * 2;
  if (ramGB >= 1) {
    return `~${ramGB.toFixed(1)} GB RAM`;
  }
  const ramMB = ramGB * 1024;
  return `~${ramMB.toFixed(0)} MB RAM`;
}

/**
 * Known approximate RAM usage for common model families.
 * Used for recommended models that aren't installed yet (no exact size available).
 * Format: model name pattern -> RAM usage label
 */
const KNOWN_MODEL_RAM_ESTIMATES: Record<string, string> = {
  // 2B models
  'gemma4:2b': '~1.5-2 GB RAM',
  'qwen3.5:2b': '~1.5-2 GB RAM',
  'llama3.2:2b': '~1.5-2 GB RAM',
  // 3B models
  'llama3.2:3b': '~2-3 GB RAM',
  'qwen3.5:3b': '~2-3 GB RAM',
  // 4B models
  'gemma4:4b': '~3-5 GB RAM',
  'qwen3.5:4b': '~3-5 GB RAM',
  // 7B models
  'qwen2.5:7b': '~5-7 GB RAM',
  'llama3.2:7b': '~5-7 GB RAM',
  'llama3.1:8b': '~6-8 GB RAM',
  // 14B models
  'llama3.2:14b': '~10-14 GB RAM',
  'qwen3.5:14b': '~10-14 GB RAM',
  // 26B MoE models (4B active)
  'gemma4:26b-a4b': '~8-12 GB RAM',
  // 27B-31B dense models
  'gemma4:27b': '~18-28 GB RAM',
  'gemma4:31b': '~20-32 GB RAM',
  'qwen3.5:27b': '~18-24 GB RAM',
  'qwen3.5:32b': '~22-30 GB RAM',
};

/**
 * Get estimated RAM usage for a model by name.
 * Used when the model isn't installed so we don't have exact size.
 */
function getEstimatedRamForModel(modelName: string): string {
  // Try exact match first
  if (KNOWN_MODEL_RAM_ESTIMATES[modelName]) {
    return KNOWN_MODEL_RAM_ESTIMATES[modelName];
  }
  // Try matching prefix (e.g., "gemma4:2b" for "gemma4:2b-something")
  for (const [pattern, ramLabel] of Object.entries(KNOWN_MODEL_RAM_ESTIMATES)) {
    if (modelName.startsWith(pattern.replace(':','-'))) {
      return ramLabel;
    }
  }
  // Try to extract size from model name (e.g., "model:7b" -> 7b)
  const sizeMatch = modelName.match(/:(\d+b(?:-[a-zA-Z0-9]+)?)/i);
  if (sizeMatch) {
    const size = sizeMatch[1];
    // Rough estimate based on parameter count
    const paramMatch = size.match(/^(\d+)/);
    if (paramMatch) {
      const params = parseInt(paramMatch[1], 10);
      if (params <= 2) return '~1.5-2 GB RAM';
      if (params <= 3) return '~2-3 GB RAM';
      if (params <= 4) return '~3-5 GB RAM';
      if (params <= 7) return '~5-7 GB RAM';
      if (params <= 14) return '~10-14 GB RAM';
      if (params <= 27) return '~18-24 GB RAM';
      if (params >= 30) return '~20-32 GB RAM';
    }
  }
  return 'Unknown RAM';
}

/**
 * Convert Ollama model info to our ModelInfo format
 */
function toModelInfo(ollamaModel: OllamaModelInfo): ModelInfo {
  return {
    name: ollamaModel.name,
    sizeBytes: ollamaModel.sizeBytes,
    sizeLabel: formatSizeLabel(ollamaModel.sizeBytes),
    ramUsageLabel: estimateRamUsage(ollamaModel.sizeBytes),
  };
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
    let installedModelsInfo: ModelInfo[] = [];
    let ollamaOnline = false;
    try {
      const ollamaService = getOllamaService();
      ollamaOnline = await ollamaService.isOnline();
      if (ollamaOnline) {
        const models = await ollamaService.listModels();
        installedModels = models.map((m) => m.name);
        installedModelsInfo = models.map(toModelInfo);
      }
    } catch {
      // Ollama is offline - installedModels stays empty
      ollamaOnline = false;
    }

    // Compute recommended models (not installed) with estimated RAM
    const recommendedModelsInfo: ModelInfo[] = [];
    if (systemInfo) {
      const recommendedNames = [
        systemInfo.recommendedModel,
        ...(systemInfo.recommendedModelAlt || []),
      ].filter((m) => m && !installedModels.includes(m));

      for (const name of recommendedNames) {
        recommendedModelsInfo.push({
          name,
          sizeBytes: 0,
          sizeLabel: 'Not installed',
          ramUsageLabel: getEstimatedRamForModel(name),
        });
      }
    }

    const response: SettingsResponse = {
      selectedModel: settings.selectedModel,
      ttsVoice: settings.ttsVoice,
      ttsRate: settings.ttsRate,
      ttsPitch: settings.ttsPitch,
      sttModel: settings.sttModel,
      systemInfo,
      installedModels,
      installedModelsInfo,
      recommendedModelsInfo,
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

    // Note: We don't validate that selectedModel is installed.
    // Users can pre-select a recommended model before installing it.
    // Ollama will download the model on first use if it's not installed.
    // The user should run `ollama pull <model>` to download it beforehand.

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

    // Validate sttModel if provided
    if ('sttModel' in updates) {
      if (typeof updates.sttModel !== 'string') {
        res.status(400).json({ error: 'sttModel must be a string' });
        return;
      }
      // sttModel can be empty string to clear the selection
      // but if non-empty, it should be a valid model name
      if (updates.sttModel.trim().length === 0) {
        res.status(400).json({ error: 'sttModel cannot be empty' });
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
    let installedModelsInfo: ModelInfo[] = [];
    let ollamaOnline = false;
    try {
      const ollamaService = getOllamaService();
      ollamaOnline = await ollamaService.isOnline();
      if (ollamaOnline) {
        const models = await ollamaService.listModels();
        installedModels = models.map((m) => m.name);
        installedModelsInfo = models.map(toModelInfo);
      }
    } catch {
      ollamaOnline = false;
    }

    // Compute recommended models (not installed) with estimated RAM
    const recommendedModelsInfo: ModelInfo[] = [];
    if (systemInfo) {
      const recommendedNames = [
        systemInfo.recommendedModel,
        ...(systemInfo.recommendedModelAlt || []),
      ].filter((m) => m && !installedModels.includes(m));

      for (const name of recommendedNames) {
        recommendedModelsInfo.push({
          name,
          sizeBytes: 0,
          sizeLabel: 'Not installed',
          ramUsageLabel: getEstimatedRamForModel(name),
        });
      }
    }

    const response: SettingsResponse = {
      selectedModel: updatedSettings.selectedModel,
      ttsVoice: updatedSettings.ttsVoice,
      ttsRate: updatedSettings.ttsRate,
      ttsPitch: updatedSettings.ttsPitch,
      sttModel: updatedSettings.sttModel,
      systemInfo,
      installedModels,
      installedModelsInfo,
      recommendedModelsInfo,
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
    // Return just model names for backwards compatibility
    res.json({ models: models.map((m) => m.name), ollamaOnline: true });
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    const message = error instanceof Error ? error.message : 'Failed to list models';
    res.status(500).json({ error: message, models: [], ollamaOnline: false });
  }
});

/**
 * POST /api/settings/pull-model
 *
 * Pulls (downloads) a model from Ollama registry with progress streaming.
 * The response is a text/event-stream with SSE events.
 */
router.post('/pull-model', async (req: Request, res: Response) => {
  const { model } = req.body;

  if (!model || typeof model !== 'string') {
    res.status(400).json({ error: 'model is required and must be a string' });
    return;
  }

  const ollamaService = getOllamaService();

  try {
    const isOnline = await ollamaService.isOnline();
    if (!isOnline) {
      res.status(503).json({ error: 'Ollama is offline. Please start Ollama to download models.' });
      return;
    }

    // Check if already installed
    const installedModels = await ollamaService.listModels();
    if (installedModels.some((m) => m.name === model)) {
      res.status(200).json({ message: 'Model already installed', status: 'already_installed' });
      return;
    }

    // Set up SSE for streaming progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Stream progress to client
    let lastProgress = 0;
    for await (const progress of ollamaService.pullModel(model)) {
      // Calculate percentage
      const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
      
      // Only send updates when progress changes meaningfully
      if (percent !== lastProgress) {
        lastProgress = percent;
        res.write(`data: ${JSON.stringify({ status: progress.status, percent, completed: progress.completed, total: progress.total })}\n\n`);
      }
    }

    // Final success message
    res.write(`data: ${JSON.stringify({ status: 'success', percent: 100, message: 'Model downloaded successfully' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error pulling model:', error);
    const message = error instanceof Error ? error.message : 'Failed to pull model';
    
    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ status: 'error', message })}\n\n`);
      res.end();
    }
  }
});

/**
 * STT Model Info response
 */
export interface SttModelInfo {
  name: string;
  path: string;
  sizeMB: number;
  memoryMB: number;
}

/**
 * Get the STT models directory path
 * Resolves to the servers/stt/ directory relative to the project root
 */
function getSttModelsDir(): string {
  // Get project root (two levels up from this file in dist or src)
  const currentDir = resolve('.');
  return join(currentDir, 'servers', 'stt');
}

/**
 * Get size of a directory recursively (in bytes).
 * Uses statSync to follow symlinks, so symlinked directories are counted.
 */
function getDirSize(dirPath: string): number {
  let totalSize = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      // Use statSync (not lstatSync) to follow symlinks
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        totalSize += getDirSize(fullPath);
      } else if (stat.isFile()) {
        totalSize += stat.size;
      }
      // symlinks to files are treated as files (stat.isFile() returns true for symlink targets)
      // symlinks to directories are treated as directories (stat.isDirectory() returns true for symlink targets)
    }
  } catch {
    // Ignore errors accessing directories
  }
  return totalSize;
}

/**
 * Estimate memory usage for STT model based on size.
 * Whisper models typically need ~2x their disk size in RAM for inference.
 */
function estimateSttModelMemory(sizeBytes: number): number {
  // Rough estimate: memory is about 2x disk size
  return Math.round((sizeBytes * 2) / (1024 * 1024));
}

/**
 * GET /api/settings/stt-models
 *
 * Returns list of available STT models from servers/stt/ directory.
 * Each model includes name, path, size in MB, and estimated memory usage.
 */
router.get('/stt-models', async (_req: Request, res: Response) => {
  try {
    const sttModelsDir = getSttModelsDir();

    // Check if directory exists
    if (!existsSync(sttModelsDir)) {
      res.json({ models: [] });
      return;
    }

    // Read directory and find model directories
    const entries = readdirSync(sttModelsDir, { withFileTypes: true });
    const models: SttModelInfo[] = [];

    for (const entry of entries) {
      // On macOS, readdirSync returns symlinks as symlinks (not directories).
      // entry.isDirectory() returns false for symlinks. Use statSync to follow
      // symlinks and check if the target is actually a directory.
      let isDir = entry.isDirectory();
      if (!isDir) {
        // Check if this is a symlink that points to a directory
        try {
          const stat = statSync(join(sttModelsDir, entry.name));
          isDir = stat.isDirectory();
        } catch {
          // Not a valid directory (broken symlink or other error)
          isDir = false;
        }
      }
      if (!isDir) continue;

      const modelName = entry.name;
      // Only include sherpa-onnx-whisper-* directories
      if (!modelName.startsWith('sherpa-onnx-whisper-')) continue;

      const modelPath = join(sttModelsDir, modelName);
      const sizeBytes = getDirSize(modelPath);
      const sizeMB = Math.round(sizeBytes / (1024 * 1024));
      const memoryMB = estimateSttModelMemory(sizeBytes);

      models.push({
        name: modelName,
        path: modelPath,
        sizeMB,
        memoryMB,
      });
    }

    res.json({ models });
  } catch (error) {
    console.error('Error listing STT models:', error);
    res.status(500).json({ error: 'Failed to list STT models' });
  }
});

/**
 * POST /api/settings/stt-reload
 *
 * Triggers hot-reload of the STT model via the sherpa-onnx server.
 * The STT server's POST /reload endpoint performs the actual model switch.
 */
router.post('/stt-reload', async (req: Request, res: Response) => {
  try {
    const { modelDir } = req.body;

    // Validate modelDir is provided
    if (!modelDir || typeof modelDir !== 'string') {
      res.status(400).json({ error: 'modelDir is required and must be a string' });
      return;
    }

    // Check if model directory exists
    const sttModelsDir = getSttModelsDir();
    const modelPath = join(sttModelsDir, modelDir);

    if (!existsSync(modelPath)) {
      res.status(400).json({ error: `Model directory not found: ${modelDir}` });
      return;
    }

    // Check if STT server is running
    const sttService = getSttService();
    const isOnline = await sttService.isOnline();

    if (!isOnline) {
      res.status(503).json({ error: 'STT server is not running' });
      return;
    }

    // Trigger hot-reload via the STT service which proxies to sherpa-onnx /reload endpoint
    // The sherpa-onnx server handles the actual model switching asynchronously
    const result = await sttService.reload(modelPath);

    res.json({
      success: true,
      message: result.message || 'STT model reload initiated',
      model_dir: result.model_dir || modelPath,
    });
  } catch (error) {
    console.error('Error reloading STT model:', error);
    if (error instanceof SttOfflineError) {
      res.status(503).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to reload STT model' });
    }
  }
});

export { router as settingsRouter };
export default router;
