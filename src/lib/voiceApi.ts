/**
 * API client for voice operations (STT and TTS)
 * Proxies requests to backend STT/TTS services
 */

import { getAuthHeader } from './auth';

const STT_BASE_URL = '/api/stt';
const TTS_BASE_URL = '/api/tts';

export interface TranscribeResult {
  text: string;
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

export class VoiceAPIClient {
  /**
   * Transcribe audio blob to text using STT service
   * Expects 16kHz mono 16-bit PCM WAV audio
   */
  async transcribe(audioBlob: Blob): Promise<TranscribeResult> {
    const authHeader = getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'audio/wav',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${STT_BASE_URL}/transcribe`, {
      method: 'POST',
      headers,
      body: audioBlob,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `STT transcription failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Synthesize text to MP3 audio using TTS service
   * Returns the audio as a Blob that can be played
   */
  async synthesize(request: SynthesizeRequest): Promise<Blob> {
    const authHeader = getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${TTS_BASE_URL}/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `TTS synthesis failed: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Get available voices from the TTS service
   */
  async getVoices(): Promise<Array<{ name: string; locale: string; gender: string }>> {
    const authHeader = getAuthHeader();
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${TTS_BASE_URL}/voices`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices;
  }

  /**
   * Check STT service health
   */
  async checkSttHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${STT_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check TTS service health
   */
  async checkTtsHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${TTS_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const voiceAPI = new VoiceAPIClient();
