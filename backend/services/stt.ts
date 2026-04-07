/**
 * STT (Speech-to-Text) service - proxies transcription requests to the sherpa-onnx STT server.
 * The STT server runs Whisper locally and returns text from WAV audio.
 */

export class SttOfflineError extends Error {
  constructor(message: string = 'STT server is not running. To start it: cd servers/stt && node server.mjs --port 8765') {
    super(message);
    this.name = 'SttOfflineError';
  }
}

export interface SttTranscribeResult {
  text: string;
}

export interface SttHealthCheck {
  status: string;
  model_loaded: boolean;
  model_dir: string;
}

/**
 * STT service that communicates with the sherpa-onnx Whisper HTTP server.
 */
export class SttService {
  private host: string;
  private port: number;

  constructor(host?: string, port?: number) {
    this.host = host || process.env.STT_HOST || '127.0.0.1';
    this.port = port || parseInt(process.env.STT_PORT || '8765', 10);
  }

  private baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Check if the STT server is online and responding.
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl()}/health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get health information from the STT server.
   */
  async healthCheck(): Promise<SttHealthCheck> {
    const response = await fetch(`${this.baseUrl()}/health`);
    if (!response.ok) {
      throw new Error(`STT server returned ${response.status}`);
    }
    return response.json();
  }

  /**
   * Transcribe WAV audio data to text.
   * @param wavBuffer - Raw WAV bytes (16kHz mono 16-bit PCM)
   * @returns The transcribed text
   */
  async transcribe(wavBuffer: Buffer): Promise<SttTranscribeResult> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      throw new SttOfflineError();
    }

    const response = await fetch(`${this.baseUrl()}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
      },
      body: wavBuffer.buffer.slice(wavBuffer.byteOffset, wavBuffer.byteOffset + wavBuffer.byteLength) as ArrayBuffer,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`STT transcribe failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    return { text: data.text ?? '' };
  }

  /**
   * Reload the STT model with a new model directory.
   * @param modelDir - Path to the new model directory
   */
  async reload(modelDir: string): Promise<{ message: string; model_dir: string }> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      throw new SttOfflineError();
    }

    const response = await fetch(`${this.baseUrl()}/reload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelDir }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`STT reload failed (${response.status}): ${body}`);
    }

    return response.json();
  }
}

// Singleton instance
let sttServiceInstance: SttService | null = null;

export function getSttService(host?: string, port?: number): SttService {
  if (!sttServiceInstance) {
    sttServiceInstance = new SttService(host, port);
  }
  return sttServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSttService(): void {
  sttServiceInstance = null;
}
