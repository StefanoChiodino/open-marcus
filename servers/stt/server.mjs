#!/usr/bin/env node
/**
 * sherpa-onnx Whisper STT server for OpenMarcus
 * Wraps Whisper behind a simple HTTP API for speech-to-text.
 *
 * Usage:
 *     node servers/stt/server.mjs [options]
 *
 *     --model-dir     path to extracted model (default: auto-detect in servers/stt/)
 *     --host          bind address (default: 127.0.0.1)
 *     --port          listen port (default: 8765)
 *     --num-threads   inference threads (default: 2)
 *
 * POST /transcribe   Content-Type: audio/wav   Body: raw WAV bytes (16kHz mono 16-bit PCM)
 *                    Response: {"text": "..."}
 * GET  /health       Response: {"status":"ok","model_loaded":true|false}
 */

import { createServer } from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    host: '127.0.0.1',
    port: 8765,
    modelDir: '',
    numThreads: 2,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) result.host = args[++i];
    else if (args[i] === '--port' && args[i + 1]) result.port = parseInt(args[++i], 10);
    else if (args[i] === '--model-dir' && args[i + 1]) result.modelDir = args[++i];
    else if (args[i] === '--num-threads' && args[i + 1]) result.numThreads = parseInt(args[++i], 10);
  }

  return result;
}

const { host, port, modelDir, numThreads } = parseArgs();
const HOST = host;
const PORT = port;
const NUM_THREADS = numThreads;

// ── Model directory auto-detection ──────────────────────────

function findModelDir() {
  if (modelDir) return resolve(modelDir);
  // Look for any sherpa-onnx-whisper-* directory inside servers/stt/
  const candidates = readdirSync(__dirname)
    .filter(d => d.startsWith('sherpa-onnx-whisper-') && existsSync(join(__dirname, d)));
  if (candidates.length > 0) return join(__dirname, candidates[0]);
  throw new Error(
    'No model found. Run: cd servers/stt && bash download-model.sh\n' +
    'Or specify --model-dir /path/to/model'
  );
}

const MODEL_DIR = findModelDir();

/**
 * Get the effective model directory (supports runtime override during reload).
 */
function getModelDir() {
  // @ts-ignore - runtime override for reload
  return global.__MODEL_DIR || MODEL_DIR;
}

/**
 * Detect model type from directory contents and build the recognizer config.
 */
function detectModelConfig() {
  const effectiveModelDir = getModelDir();
  const dirName = basename(effectiveModelDir);
  const files = readdirSync(effectiveModelDir);

  const encoderFile = files.find(f => f.includes('encoder') && f.endsWith('.onnx'));
  const decoderFile = files.find(f => f.includes('decoder') && f.endsWith('.onnx'));
  const tokensFile = files.find(f => f.endsWith('-tokens.txt')) || files.find(f => f === 'tokens.txt');

  if (!tokensFile) throw new Error(`No tokens file found in ${effectiveModelDir}`);

  if (dirName.includes('whisper') && encoderFile && decoderFile) {
    // Prefer int8 if available
    const int8Encoder = files.find(f => f.includes('encoder') && f.includes('int8') && f.endsWith('.onnx'));
    const int8Decoder = files.find(f => f.includes('decoder') && f.includes('int8') && f.endsWith('.onnx'));
    return {
      type: 'whisper',
      config: {
        featConfig: { sampleRate: 16000, featureDim: 80 },
        modelConfig: {
          whisper: {
            encoder: join(effectiveModelDir, int8Encoder || encoderFile),
            decoder: join(effectiveModelDir, int8Decoder || decoderFile),
          },
          tokens: join(effectiveModelDir, tokensFile),
          numThreads: NUM_THREADS,
          provider: 'cpu',
          debug: 0,
        },
      },
    };
  }

  throw new Error(`Cannot detect model type in ${effectiveModelDir}. Found files: ${files.join(', ')}`);
}

// ── WAV parsing ─────────────────────────────────────────────

function parseWav(buf) {
  if (buf.length < 44) throw new Error('WAV too short');
  const riff = buf.toString('ascii', 0, 4);
  if (riff !== 'RIFF') throw new Error('Not a WAV file');

  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;
  let i = 12;
  while (i < buf.length - 8) {
    const chunkId = buf.toString('ascii', i, i + 4);
    const chunkSize = buf.readUInt32LE(i + 4);
    if (chunkId === 'fmt ') fmtOffset = i + 8;
    if (chunkId === 'data') { dataOffset = i + 8; dataSize = chunkSize; break; }
    i += 8 + chunkSize;
    if (chunkSize % 2 !== 0) i++;
  }
  if (fmtOffset < 0 || dataOffset < 0) throw new Error('Invalid WAV: missing fmt/data chunks');

  const audioFormat = buf.readUInt16LE(fmtOffset);
  const channels = buf.readUInt16LE(fmtOffset + 2);
  const sampleRate = buf.readUInt32LE(fmtOffset + 4);
  const bitsPerSample = buf.readUInt16LE(fmtOffset + 14);

  if (audioFormat !== 1) throw new Error(`Unsupported WAV format: ${audioFormat} (expected PCM=1)`);
  if (channels !== 1) throw new Error(`Expected mono, got ${channels} channels`);

  const raw = buf.subarray(dataOffset, dataOffset + dataSize);

  let samples;
  if (bitsPerSample === 16) {
    const int16 = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
    samples = new Float32Array(int16.length);
    for (let j = 0; j < int16.length; j++) samples[j] = int16[j] / 32768.0;
  } else if (bitsPerSample === 32) {
    const int32 = new Int32Array(raw.buffer, raw.byteOffset, raw.length / 4);
    samples = new Float32Array(int32.length);
    for (let j = 0; j < int32.length; j++) samples[j] = int32[j] / 2147483648.0;
  } else if (bitsPerSample === 8) {
    const uint8 = new Uint8Array(raw.buffer, raw.byteOffset, raw.length);
    samples = new Float32Array(uint8.length);
    for (let j = 0; j < uint8.length; j++) samples[j] = (uint8[j] - 128) / 128.0;
  } else {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample}`);
  }

  return { samples, sampleRate };
}

// ── Model lifecycle ─────────────────────────────────────────

let recognizer = null;
let loadPromise = null;
let isReloading = false;
let currentModelDir = MODEL_DIR;

async function loadModel(newModelDir = MODEL_DIR) {
  // Use createRequire for the native module
  let sherpa_onnx;
  try {
    sherpa_onnx = require('sherpa-onnx-node');
  } catch (err) {
    throw new Error(`Failed to load sherpa-onnx-node: ${err.message}`);
  }

  console.log(`Loading model from ${newModelDir} (${NUM_THREADS} threads)...`);
  const t0 = Date.now();

  // Temporarily override MODEL_DIR for detectModelConfig
  const savedModelDir = MODEL_DIR;
  // @ts-ignore - runtime override
  global.__MODEL_DIR = newModelDir;
  const detected = detectModelConfig();
  // @ts-ignore - restore
  global.__MODEL_DIR = savedModelDir;
  
  recognizer = new sherpa_onnx.OfflineRecognizer(detected.config);
  currentModelDir = newModelDir;
  console.log(`Model ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function getRecognizer() {
  if (!recognizer) {
    if (!loadPromise) {
      loadPromise = loadModel();
    }
    await loadPromise;
  }
  return recognizer;
}

/**
 * Reload the model with a new model directory.
 * During reload, the server returns 503 for transcribe requests.
 */
async function reloadModel(newModelDir) {
  if (isReloading) {
    throw new Error('Reload already in progress');
  }

  isReloading = true;

  try {
    // Stop current recognizer if exists
    if (recognizer) {
      recognizer = null;
    }
    if (loadPromise) {
      await loadPromise.catch(() => {}); // Wait for any in-progress load
    }
    loadPromise = null;

    // Load new model
    await loadModel(newModelDir);
  } finally {
    isReloading = false;
  }
}

// ── HTTP server ─────────────────────────────────────────────

function jsonResponse(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';

  // GET /health
  if (req.method === 'GET' && url === '/health') {
    jsonResponse(res, 200, {
      status: isReloading ? 'reloading' : 'ok',
      model_loaded: recognizer !== null && !isReloading,
      model_dir: currentModelDir,
    });
    return;
  }

  // POST /reload
  if (req.method === 'POST' && url === '/reload') {
    let body;
    try {
      body = await collectBody(req);
    } catch {
      jsonResponse(res, 400, { error: 'Failed to read request body' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(body.toString());
    } catch {
      jsonResponse(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const { modelDir: newModelDir } = parsed;
    if (!newModelDir || typeof newModelDir !== 'string') {
      jsonResponse(res, 400, { error: 'modelDir is required and must be a string' });
      return;
    }

    // Validate the new model directory exists
    if (!existsSync(newModelDir)) {
      jsonResponse(res, 400, { error: `Model directory does not exist: ${newModelDir}` });
      return;
    }

    // Start reload in background and return immediately
    jsonResponse(res, 202, { message: 'Reload started', model_dir: newModelDir });

    // Perform reload asynchronously
    reloadModel(newModelDir).catch(err => {
      console.error('Reload failed:', err.message);
    });
    return;
  }

  // POST /transcribe
  if (req.method === 'POST' && url === '/transcribe') {
    // Return 503 if reloading
    if (isReloading || !recognizer) {
      jsonResponse(res, 503, { error: 'STT server is reloading, please try again later' });
      return;
    }

    let body;
    try {
      body = await collectBody(req);
    } catch {
      jsonResponse(res, 400, { error: 'Failed to read request body' });
      return;
    }

    if (!body || body.length === 0) {
      jsonResponse(res, 400, { error: 'Empty request body' });
      return;
    }

    // Parse WAV
    let wav;
    try {
      wav = parseWav(body);
    } catch (err) {
      jsonResponse(res, 400, { error: `WAV parse error: ${err.message}` });
      return;
    }

    // Transcribe
    try {
      const rec = await getRecognizer();
      const stream = rec.createStream();
      const t0 = Date.now();
      stream.acceptWaveform({ sampleRate: wav.sampleRate, samples: wav.samples });
      rec.decode(stream);
      const result = rec.getResult(stream);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

      let text = (result.text ?? '').trim();
      console.log(`[${elapsed}s] ${JSON.stringify(text)}`);
      jsonResponse(res, 200, { text });
    } catch (err) {
      console.error('Transcription error:', err);
      jsonResponse(res, 500, { error: `Transcription failed: ${err.message}` });
    }
    return;
  }

  // 404
  res.writeHead(404);
  res.end();
});

// ── Start ───────────────────────────────────────────────────

// Listen on PORT, HOST
server.listen(PORT, HOST, () => {
  console.log(`STT server listening on http://${HOST}:${PORT}`);
});
