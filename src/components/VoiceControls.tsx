import { useCallback, useEffect, useRef } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { useTTSStore } from '../stores/ttsSettingsStore';
import { VoiceInputManager } from '../lib/voiceInputManager';
import { voiceAPI } from '../lib/voiceApi';
import './VoiceControls.css';

export interface VoiceControlsProps {
  /** Callback when voice transcription succeeds with the transcribed text */
  onTranscript?: (text: string) => void;
  /** Callback when audio finishes speaking */
  onSpeechEnd?: () => void;
  /** Optional: disable controls (e.g., while sending message) */
  disabled?: boolean;
}

/**
 * VoiceControls - Microphone and Speaker toggle buttons
 *
 * Features:
 * - Microphone button: Click to start/stop recording, triggers browser permission prompt
 * - Speaker button: Toggle voice output for TTS playback
 * - Recording indicator visible during recording
 * - Permission denied handling with error message
 */
function VoiceControls({ onTranscript, onSpeechEnd, disabled = false }: VoiceControlsProps) {
  const {
    voiceInputEnabled,
    voiceOutputEnabled,
    status,
    error,
    toggleVoiceInput,
    toggleVoiceOutput,
    setStatus,
    setError,
    clearError,
  } = useVoiceStore();

  const managerRef = useRef<VoiceInputManager | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * Initialize or get the voice input manager
   */
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      const manager = new VoiceInputManager();
      manager.onState((state, err) => {
        setStatus(state);
        if (err) {
          setError(err.message);
        }
      });
      managerRef.current = manager;
    }
    return managerRef.current;
  }, [setStatus, setError]);

  /**
   * Toggle voice input - when enabling, request permission
   */
  const handleToggleInput = useCallback(async () => {
    if (status === 'recording') {
      // Stop recording and transcribe
      const manager = getManager();
      const text = await manager.stopAndTranscribe(async (blob) => {
        const result = await voiceAPI.transcribe(blob);
        return result.text;
      });

      if (text !== null && text.trim().length > 0 && onTranscript) {
        onTranscript(text.trim());
      }
    } else {
      // Clear any previous errors
      clearError();

      // Toggle the preference
      toggleVoiceInput();

      // If enabling, request permission immediately
      if (!voiceInputEnabled) {
        const manager = getManager();
        const allowed = await manager.requestPermission();

        if (allowed) {
          // Start recording
          await manager.startRecording();
        } else {
          // Permission was denied - toggle back off
          toggleVoiceInput();
        }
      } else {
        // Disabling - release resources
        if (managerRef.current) {
          managerRef.current.cleanup();
        }
      }
    }
  }, [
    status,
    getManager,
    clearError,
    toggleVoiceInput,
    voiceInputEnabled,
    onTranscript,
  ]);

  /**
   * Handle microphone button click
   */
  const handleMicClick = useCallback(() => {
    if (disabled) return;

    if (status === 'recording') {
      handleToggleInput();
    } else if (voiceInputEnabled) {
      // Voice input is enabled but not currently recording - start recording
      clearError();
      const manager = getManager();
      manager.startRecording();
    } else {
      // Voice input not enabled - enable and request permission
      handleToggleInput();
    }
  }, [disabled, status, voiceInputEnabled, handleToggleInput, clearError, getManager]);

  /**
   * Speak text using TTS service
   */
  const speak = useCallback(
    async (text: string) => {
      if (!voiceOutputEnabled || !text.trim()) return;

      // Get cached TTS settings
      const ttsVoice = useTTSStore.getState().voice;
      const ttsRate = useTTSStore.getState().rate;
      const ttsPitch = useTTSStore.getState().pitch;

      try {
        setStatus('speaking');
        const audioBlob = await voiceAPI.synthesize({
          text: text.trim(),
          voice: ttsVoice,
          rate: ttsRate,
          pitch: ttsPitch,
        });

        const url = URL.createObjectURL(audioBlob);

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setStatus('idle');
          onSpeechEnd?.();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          setStatus('idle');
        };

        await audio.play();
      } catch {
        // TTS failed - continue silently
        setStatus('idle');
      }
    },
    [voiceOutputEnabled, onSpeechEnd, setStatus],
  );

  /**
   * Speak text, queueing if currently speaking
   */
  const speakOrQueue = useCallback(
    async (text: string) => {
      // Wait for current speech to finish
      if (speechPromiseRef.current) {
        await speechPromiseRef.current;
      }

      speechPromiseRef.current = speak(text);
      await speechPromiseRef.current;
      speechPromiseRef.current = null;

      // After this response's speech, speak the next text if there are any
    },
    [speak],
  );

  /**
   * Cancel any ongoing speech
   */
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    speechPromiseRef.current = null;
    setStatus('idle');
  }, [setStatus]);

  /**
   * Toggle voice output
   */
  const handleToggleOutput = useCallback(() => {
    const currentEnabled = useVoiceStore.getState().voiceOutputEnabled;
    toggleVoiceOutput();
    // If disabling while speaking, stop the current speech
    if (currentEnabled && audioRef.current) {
      stopSpeaking();
    }
  }, [toggleVoiceOutput, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const isRecording = status === 'recording';
  const isPermissionDenied = status === 'permission-denied';
  const isProcessing = status === 'processing';

  return (
    <div className="voice-controls" role="toolbar" aria-label="Voice controls">
      {/* Microphone button */}
      <button
        type="button"
        className={`voice-controls__button voice-controls__mic ${
          isRecording ? 'voice-controls__mic--recording' : ''
        }${voiceInputEnabled ? ' voice-controls__button--active' : ''}`}
        onClick={handleMicClick}
        disabled={disabled || isProcessing}
        title={getMicTitle(status, voiceInputEnabled)}
        aria-label={getMicAriaLabel(status, voiceInputEnabled)}
        aria-pressed={voiceInputEnabled}
      >
        {isRecording ? (
          // Recording indicator - pulsing mic icon
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="voice-controls__pulse-icon"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Standard mic icon
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Permission denied message */}
      {isPermissionDenied && error && (
        <div className="voice-controls__error" role="alert" aria-live="polite">
          {error}
          <button
            type="button"
            className="voice-controls__dismiss"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* General error message */}
      {status === 'error' && error && !isPermissionDenied && (
        <div className="voice-controls__error" role="alert" aria-live="polite">
          {error}
          <button
            type="button"
            className="voice-controls__dismiss"
            onClick={clearError}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="voice-controls__processing" role="status" aria-live="polite">
          <span className="voice-controls__processing-dots">
            <span className="voice-controls__processing-dot" />
            <span className="voice-controls__processing-dot" />
            <span className="voice-controls__processing-dot" />
          </span>
          Transcribing...
        </div>
      )}

      {/* Speaker button */}
      <button
        type="button"
        className={`voice-controls__button voice-controls__speaker ${
          status === 'speaking' ? ' voice-controls__speaker--speaking' : ''
        }${voiceOutputEnabled ? ' voice-controls__button--active' : ''}`}
        onClick={handleToggleOutput}
        title={voiceOutputEnabled ? 'Voice output enabled. Click to disable.' : 'Enable voice output'}
        aria-label={voiceOutputEnabled ? 'Voice output enabled. Click to disable.' : 'Enable voice output'}
        aria-pressed={voiceOutputEnabled}
      >
        {status === 'speaking' ? (
          // Speaking: animated speaker with sound waves
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="voice-controls__speaker-icon voice-controls__speaker-icon--speaking"
            onClick={(e) => {
              e.stopPropagation();
              stopSpeaking();
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Speaker body */}
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"
              clipRule="evenodd"
            />
            {/* Sound wave 1 */}
            <path
              fillRule="evenodd"
              d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
              clipRule="evenodd"
              className="voice-controls__sound-wave voice-controls__sound-wave--1"
            />
            {/* Sound wave 2 */}
            <path
              fillRule="evenodd"
              d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z"
              clipRule="evenodd"
              className="voice-controls__sound-wave voice-controls__sound-wave--2"
            />
          </svg>
        ) : voiceOutputEnabled ? (
          // Enabled (idle): full speaker icon, colored/highlighted
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="voice-controls__speaker-icon voice-controls__speaker-icon--enabled"
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Disabled: muted speaker icon (speaker with X), grey/outlined
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="voice-controls__speaker-icon voice-controls__speaker-icon--disabled"
          >
            {/* Speaker body */}
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.707 10.707a1 1 0 01-1.414 1.414L12 10.828l-1.293 1.293a1 1 0 01-1.414-1.414L10.586 9.414 9.293 8.121a1 1 0 011.414-1.414L12 8.414l1.293-1.293a1 1 0 011.414 1.414L13.414 9.707l1.293 1.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Expose speak function to parent via a data attribute and event */}
      <VoiceOutputBridge
        speak={speakOrQueue}
        voiceEnabled={voiceOutputEnabled}
      />
    </div>
  );
}

/**
 * Helper to dispatch voice output requests from parent components
 */
interface VoiceOutputBridgeProps {
  speak: (text: string) => Promise<void>;
  voiceEnabled: boolean;
}

function VoiceOutputBridge({ speak }: VoiceOutputBridgeProps) {
  // Listen for custom 'marcus-speak' events on this element
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handler = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      speak(text);
    };

    element.addEventListener('marcus-speak', handler as EventListener);

    return () => {
      element.removeEventListener('marcus-speak', handler as EventListener);
    };
  }, [speak]);

  return <div ref={ref} className="voice-output-bridge" hidden aria-hidden="true" />;
}

/**
 * Expose the speak function to be called programmatically by parent components
 */
// eslint-disable-next-line react-refresh/only-export-components
export function dispatchSpeak(text: string): void {
  // Find the voice output bridge element and dispatch event
  const bridge = document.querySelector('.voice-output-bridge');
  if (bridge) {
    bridge.dispatchEvent(new CustomEvent('marcus-speak', { detail: text }));
  }
}

function getMicTitle(status: string, enabled: boolean): string {
  switch (status) {
    case 'recording':
      return 'Recording... Click to stop';
    case 'processing':
      return 'Processing audio...';
    case 'permission-denied':
      return 'Microphone access denied';
    case 'error':
      return 'Error - click to retry';
    default:
      return enabled ? 'Click to start recording' : 'Enable voice input';
  }
}

function getMicAriaLabel(status: string, enabled: boolean): string {
  switch (status) {
    case 'recording':
      return 'Recording voice input. Click to stop recording.';
    case 'processing':
      return 'Processing audio transcription.';
    case 'permission-denied':
      return 'Microphone access denied. Click to retry.';
    case 'error':
      return 'Voice input error. Click to retry.';
    default:
      return enabled
        ? 'Voice input enabled. Click to start recording.'
        : 'Enable voice input. Click to request microphone permission.';
  }
}

export default VoiceControls;
