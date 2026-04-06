/**
 * Voice input manager
 * Handles microphone recording using MediaRecorder API
 * Manages permission handling, audio recording, and WAV encoding
 * Triggers browser permission prompt via getUserMedia
 */

export type VoiceInputState = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'error' | 'permission-denied';

export interface VoiceInputError {
  message: string;
  code: 'permission-denied' | 'not-allowed' | 'aborted' | 'recording-failed' | 'transcription-failed';
}

/**
 * Convert AudioBuffer to WAV Blob
 * Creates 16kHz mono 16-bit PCM WAV (expected by sherpa-onnx STT server)
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  // Resample to 16kHz mono if needed
  let samples: Float32Array;
  if (buffer.numberOfChannels > 1) {
    // Mix down to mono
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    samples = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      samples[i] = (left[i] + right[i]) / 2;
    }
  } else {
    samples = buffer.getChannelData(0);
  }

  // Resample to 16kHz if needed
  let resampled: Float32Array;
  if (buffer.sampleRate !== sampleRate) {
    const ratio = buffer.sampleRate / sampleRate;
    const newLength = Math.floor(samples.length / ratio);
    resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      resampled[i] = samples[Math.floor(i * ratio)];
    }
  } else {
    resampled = samples;
  }

  const dataLength = resampled.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < resampled.length; i++) {
    const sample = Math.max(-1, Math.min(1, resampled[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Voice input manager class
 * Wraps MediaRecorder API for recording audio and converting to WAV
 */
export class VoiceInputManager {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private chunks: Blob[] = [];
  private onStateChange?: (state: VoiceInputState, error?: VoiceInputError) => void;

  /**
   * Request microphone permission and return the MediaStream
   * Triggers the browser permission prompt
   */
  async requestPermission(): Promise<boolean> {
    this.setState('requesting-permission');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      return true;
    } catch (error) {
      this.handlePermissionError(error);
      return false;
    }
  }

  /**
   * Start recording audio
   * Must call requestPermission first
   */
  async startRecording(): Promise<boolean> {
    if (!this.stream) {
      const allowed = await this.requestPermission();
      if (!allowed) return false;
    }

    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.stream!);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Connect for processing
      source.connect(processor);
      processor.connect(this.audioContext.destination);

      // Also create a MediaRecorder for capturing
      this.mediaRecorder = new MediaRecorder(this.stream!);
      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        // Recording stopped, chunks are ready for processing
      };

      this.mediaRecorder.onstart = () => {
        this.setState('recording');
      };

      this.mediaRecorder.onerror = () => {
        this.setState('error', { message: 'Recording failed', code: 'recording-failed' });
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      this.setState('error', {
        message: error instanceof Error ? error.message : 'Failed to start recording',
        code: 'recording-failed',
      });
      return false;
    }
  }

  /**
   * Stop recording and return audio as WAV blob
   */
  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = await this.convertToWav();
          this.cleanup();
          resolve(blob);
        } catch {
          this.cleanup();
          this.setState('error', {
            message: 'Failed to process recording',
            code: 'recording-failed',
          });
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Stop recording and transcribe the audio
   * Returns the transcribed text or null if failed
   */
  async stopAndTranscribe(
    transcribeFn: (audioBlob: Blob) => Promise<string>,
  ): Promise<string | null> {
    this.setState('processing');
    const wavBlob = await this.stopRecording();

    if (!wavBlob) {
      this.setState('error', {
        message: 'No audio data recorded',
        code: 'transcription-failed',
      });
      return null;
    }

    try {
      const result = await transcribeFn(wavBlob);
      this.setState('idle');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed';
      this.setState('error', {
        message: message,
        code: 'transcription-failed',
      });
      return null;
    }
  }

  /**
   * Check if currently recording
   */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get current stream (for checking permission status)
   */
  get hasPermission(): boolean {
    return this.stream !== null;
  }

  /**
   * Release all resources
   */
  cleanup(): void {
    this.setState('idle');

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore errors during cleanup
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.chunks = [];
  }

  /**
   * Register callback for state changes
   */
  onState(callback: (state: VoiceInputState, error?: VoiceInputError) => void): void {
    this.onStateChange = callback;
  }

  private setState(state: VoiceInputState, error?: VoiceInputError): void {
    this.onStateChange?.(state, error);
  }

  private handlePermissionError(error: unknown): void {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.setState('permission-denied', {
          message: 'Microphone access denied. Please enable in browser settings.',
          code: 'permission-denied',
        });
        return;
      }
      if (error.name === 'NotFoundError') {
        this.setState('error', { message: 'No microphone found', code: 'not-allowed' });
        return;
      }
      if (error.name === 'NotReadableError') {
        this.setState('error', {
          message: 'Unable to access audio hardware',
          code: 'not-allowed',
        });
        return;
      }
    }

    this.setState('error', {
      message: error instanceof Error ? error.message : 'Failed to access microphone',
      code: 'not-allowed',
    });
  }

  /**
   * Convert recorded audio chunks to WAV format
   */
  private async convertToWav(): Promise<Blob> {
    const combinedBlob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });

    // Decode the audio blob
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const audioBuffer = await this.audioContext.decodeAudioData(await combinedBlob.arrayBuffer());

    // Convert to WAV at 16kHz mono 16-bit PCM
    return audioBufferToWav(audioBuffer);
  }
}
