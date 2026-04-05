/**
 * TTS (Text-to-Speech) service - proxies speech synthesis requests to the edge-tts TTS server.
 * The TTS server runs edge-tts and returns MP3 audio from text.
 */

export class TtsOfflineError extends Error {
  constructor(message: string = 'TTS server is not running. Please ensure the TTS server is started.') {
    super(message);
    this.name = 'TtsOfflineError';
  }
}

export interface TtsSynthesizeResult {
  audio: Buffer;
  contentType: string;
}

export interface TtsHealthCheck {
  status: string;
  voice: string;
  rate: string;
  pitch: string;
}

export interface TtsSynthesizeOptions {
  rate?: string;
  pitch?: string;
  voice?: string;
}

/**
 * TTS service that communicates with the edge-tts HTTP server.
 */
export class TtsService {
  private host: string;
  private port: number;

  constructor(host?: string, port?: number) {
    this.host = host || process.env.TTS_HOST || '127.0.0.1';
    this.port = port || parseInt(process.env.TTS_PORT || '8766', 10);
  }

  private baseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Check if the TTS server is online and responding.
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
   * Get health information from the TTS server.
   */
  async healthCheck(): Promise<TtsHealthCheck> {
    const response = await fetch(`${this.baseUrl()}/health`);
    if (!response.ok) {
      throw new Error(`TTS server returned ${response.status}`);
    }
    return response.json();
  }

  /**
   * Get available voices from the TTS server.
   */
  async getVoices(): Promise<Array<{ name: string; locale: string; gender: string }>> {
    const response = await fetch(`${this.baseUrl()}/voices`);
    if (!response.ok) {
      throw new Error(`TTS server returned ${response.status}`);
    }
    const data = await response.json();
    return data.voices;
  }

  /**
   * Synthesize text to MP3 audio.
   * @param text - The text to synthesize
   * @param options - Optional voice, rate, and pitch settings
   * @returns MP3 audio buffer
   */
  async synthesize(text: string, options?: TtsSynthesizeOptions): Promise<TtsSynthesizeResult> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      throw new TtsOfflineError();
    }

    const params = new URLSearchParams();
    if (options?.rate) params.set('rate', options.rate);
    if (options?.pitch) params.set('pitch', options.pitch);
    if (options?.voice) params.set('voice', options.voice);

    const url = `${this.baseUrl()}/synthesize${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: text,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`TTS synthesize failed (${response.status}): ${body}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return {
      audio: audioBuffer,
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    };
  }
}

// Singleton instance
let ttsServiceInstance: TtsService | null = null;

export function getTtsService(host?: string, port?: number): TtsService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TtsService(host, port);
  }
  return ttsServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetTtsService(): void {
  ttsServiceInstance = null;
}
