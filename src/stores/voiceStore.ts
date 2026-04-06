/**
 * Voice store using Zustand
 * Manages voice input/output toggle preferences
 * Persists settings to localStorage for restoration
 */

import { create } from 'zustand';

export type VoiceStatus =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'processing'
  | 'error'
  | 'permission-denied'
  | 'speaking';

/** localStorage key for voice preferences */
const VOICE_PREFS_STORAGE_KEY = 'openmarcus-voice-prefs';

interface VoicePrefs {
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
}

function loadVoicePrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(VOICE_PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VoicePrefs;
      return {
        voiceInputEnabled: parsed?.voiceInputEnabled ?? false,
        voiceOutputEnabled: parsed?.voiceOutputEnabled ?? false,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { voiceInputEnabled: false, voiceOutputEnabled: false };
}

function saveVoicePrefs(prefs: VoicePrefs): void {
  try {
    localStorage.setItem(VOICE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

interface VoiceState {
  // Mode toggles (persisted)
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;

  // Current status (not persisted)
  status: VoiceStatus;
  error: string | null;

  // Actions
  toggleVoiceInput: () => void;
  toggleVoiceOutput: () => void;
  setStatus: (status: VoiceStatus) => void;
  setError: (error: string | null) => void;

  // Reset error state
  clearError: () => void;
}

const initialPrefs = loadVoicePrefs();

export const useVoiceStore = create<VoiceState>((set) => ({
  voiceInputEnabled: initialPrefs.voiceInputEnabled,
  voiceOutputEnabled: initialPrefs.voiceOutputEnabled,
  status: 'idle',
  error: null,

  toggleVoiceInput: () => {
    set((state) => {
      const newValue = !state.voiceInputEnabled;
      saveVoicePrefs({
        voiceInputEnabled: newValue,
        voiceOutputEnabled: state.voiceOutputEnabled,
      });
      return { voiceInputEnabled: newValue };
    });
  },

  toggleVoiceOutput: () => {
    set((state) => {
      const newValue = !state.voiceOutputEnabled;
      saveVoicePrefs({
        voiceInputEnabled: state.voiceInputEnabled,
        voiceOutputEnabled: newValue,
      });
      return { voiceOutputEnabled: newValue };
    });
  },

  setStatus: (status) => set({ status }),

  setError: (error) =>
    set((state) => ({
      error,
      // Preserve 'permission-denied' status — don't overwrite it with 'error'
      status: error
        ? state.status === 'permission-denied'
          ? state.status
          : 'error'
        : 'idle',
    })),

  clearError: () => set({ error: null, status: 'idle' }),
}));
