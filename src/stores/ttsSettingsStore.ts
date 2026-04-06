/**
 * TTS Settings Store using Zustand
 * Manages cached TTS voice settings (voice, rate, pitch)
 * These settings are fetched from the backend and used when synthesizing speech
 */

import { create } from 'zustand';
import { settingsAPI } from '../lib/settingsApi';

interface TTSState {
  voice: string;
  rate: string;
  pitch: string;
  isLoaded: boolean;
  error: string | null;
}

interface TTSActions {
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: { voice?: string; rate?: string; pitch?: string }) => void;
}

type TTSStore = TTSState & TTSActions;

// Default values matching the backend defaults
const DEFAULT_TTS_VOICE = 'en-US-GuyNeural';
const DEFAULT_TTS_RATE = '+25%';
const DEFAULT_TTS_PITCH = '+0Hz';

export const useTTSStore = create<TTSStore>((set) => ({
  // Default values
  voice: DEFAULT_TTS_VOICE,
  rate: DEFAULT_TTS_RATE,
  pitch: DEFAULT_TTS_PITCH,
  isLoaded: false,
  error: null,

  /**
   * Fetch TTS settings from the backend API and cache them
   */
  fetchSettings: async () => {
    try {
      const response = await settingsAPI.getSettings();
      set({
        voice: response.ttsVoice,
        rate: response.ttsRate,
        pitch: response.ttsPitch,
        isLoaded: true,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch TTS settings';
      set({ error: message });
    }
  },

  /**
   * Update cached TTS settings (e.g., when Settings page saves new values)
   */
  updateSettings: (settings) => {
    set((state) => ({
      voice: settings.voice ?? state.voice,
      rate: settings.rate ?? state.rate,
      pitch: settings.pitch ?? state.pitch,
    }));
  },
}));
