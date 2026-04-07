/**
 * Tests for the VoiceControls component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VoiceControls from './VoiceControls';
import { useVoiceStore } from '../stores/voiceStore';

// Mock the VoiceInputManager
vi.mock('../lib/voiceInputManager', () => ({
  VoiceInputManager: vi.fn().mockImplementation(() => ({
    requestPermission: vi.fn().mockResolvedValue(true),
    startRecording: vi.fn().mockResolvedValue(true),
    stopRecording: vi.fn().mockResolvedValue(new Blob()),
    stopAndTranscribe: vi.fn().mockResolvedValue('Test transcription'),
    cleanup: vi.fn(),
    onState: vi.fn(),
    get isRecording() { return false; },
    get hasPermission() { return false; },
  })),
}));

// Mock the voice API
vi.mock('../lib/voiceApi', () => ({
  voiceAPI: {
    transcribe: vi.fn().mockResolvedValue({ text: 'Test transcription' }),
    synthesize: vi.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/mp3' })),
    checkSttHealth: vi.fn().mockResolvedValue(true),
    checkTtsHealth: vi.fn().mockResolvedValue(true),
    getVoices: vi.fn().mockResolvedValue([]),
  },
}));

describe('VoiceControls', () => {
  let mockOnTranscript: ReturnType<typeof vi.fn>;
  let mockOnSpeechEnd: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('openmarcus-voice-prefs');
    mockOnTranscript = vi.fn();
    mockOnSpeechEnd = vi.fn();

    useVoiceStore.setState({
      voiceInputEnabled: false,
      voiceOutputEnabled: false,
      status: 'idle',
      error: null,
    });
  });

  describe('rendering', () => {
    it('renders microphone button', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', {
        name: /enable voice input/i,
      });
      expect(micBtn).toBeInTheDocument();
    });

    it('renders speaker button', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerBtn = screen.getByRole('button', {
        name: /enable voice output/i,
      });
      expect(speakerBtn).toBeInTheDocument();
    });

    it('has toolbar role for accessibility', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      expect(screen.getByRole('toolbar', { name: 'Voice controls' })).toBeInTheDocument();
    });
  });

  describe('microphone button interaction', () => {
    it('toggles voice input on mic button click', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', {
        name: /enable voice input/i,
      });

      fireEvent.click(micBtn);

      // After clicking, the mic should be enabled (permission granted in mock)
      const state = useVoiceStore.getState();
      expect(state.voiceInputEnabled).toBe(true);
    });

    it('shows recording state when voice input is enabled', async () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', {
        name: /enable voice input/i,
      });

      fireEvent.click(micBtn);

      // After enabling, aria-label should reflect voice input is active
      await vi.waitFor(() => {
        expect(micBtn).toHaveAttribute(
          'aria-label',
          'Voice input enabled. Click to start recording.',
        );
      });
    });

    it('shows permission denied message when permission is denied', () => {
      useVoiceStore.getState().setStatus('permission-denied');
      useVoiceStore.getState().setError(
        'Microphone access denied. Please enable in browser settings.',
      );

      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      expect(
        screen.getByText('Microphone access denied. Please enable in browser settings.'),
      ).toBeInTheDocument();
    });

    it('shows processing indicator during transcription', () => {
      useVoiceStore.getState().setStatus('processing');

      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    });

    it('has aria-pressed attribute reflecting input state', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', { name: /voice input/ });
      expect(micBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows disabled state when disabled prop is true', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
          disabled={true}
        />,
      );

      const micBtn = screen.getByRole('button', { name: /voice input|enable voice input/i });
      expect(micBtn).toBeDisabled();
    });

    it('does not handle mic click when disabled', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
          disabled={true}
        />,
      );

      // Find the mic button by its class since aria-label may vary based on state
      const micBtn = screen.getByRole('button', { name: /enable voice input/i });
      expect(micBtn).toBeDisabled();
    });

    describe('permission denied handling', () => {
      it('shows dismissible error message', () => {
        useVoiceStore.getState().setStatus('permission-denied');
        useVoiceStore.getState().setError('Access denied');

        render(
          <VoiceControls
            onTranscript={mockOnTranscript}
            onSpeechEnd={mockOnSpeechEnd}
          />,
        );

        expect(screen.getByText('Access denied')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
      });

      it('clears error on dismiss click', () => {
        useVoiceStore.getState().setStatus('permission-denied');
        useVoiceStore.getState().setError('Access denied');

        render(
          <VoiceControls
            onTranscript={mockOnTranscript}
            onSpeechEnd={mockOnSpeechEnd}
          />,
        );

        const dismissBtn = screen.getByLabelText('Dismiss error');
        fireEvent.click(dismissBtn);

        const state = useVoiceStore.getState();
        expect(state.error).toBeNull();
      });
    });
  });

  describe('speaker button interaction', () => {
    it('toggles voice output on speaker button click', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerBtn = screen.getByRole('button', {
        name: /enable voice output/i,
      });

      fireEvent.click(speakerBtn);

      const state = useVoiceStore.getState();
      expect(state.voiceOutputEnabled).toBe(true);
    });

    it('has aria-pressed attribute reflecting output state', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerBtn = screen.getByRole('button', { name: /voice output/ });
      expect(speakerBtn).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(speakerBtn);
      expect(speakerBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('updates title when voice output is enabled', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerBtn = screen.getByRole('button', { name: /voice output/ });
      expect(speakerBtn).toHaveAttribute('title', 'Enable voice output');

      fireEvent.click(speakerBtn);
      expect(speakerBtn).toHaveAttribute(
        'title',
        'Voice output enabled. Click to disable.',
      );
    });

    it('shows disabled speaker icon when voice output is disabled', () => {
      useVoiceStore.setState({ voiceOutputEnabled: false, status: 'idle' });

      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerIcon = screen.getByRole('button', { name: /voice output/i })
        .querySelector('.voice-controls__speaker-icon');
      expect(speakerIcon).toHaveClass('voice-controls__speaker-icon--disabled');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--enabled');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--speaking');
    });

    it('shows enabled speaker icon when voice output is enabled (idle state)', () => {
      useVoiceStore.setState({ voiceOutputEnabled: true, status: 'idle' });

      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerIcon = screen.getByRole('button', { name: /voice output/i })
        .querySelector('.voice-controls__speaker-icon');
      expect(speakerIcon).toHaveClass('voice-controls__speaker-icon--enabled');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--disabled');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--speaking');
    });

    it('shows speaking speaker icon when status is speaking', () => {
      useVoiceStore.setState({ voiceOutputEnabled: true, status: 'speaking' });

      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerIcon = screen.getByRole('button', { name: /voice output/i })
        .querySelector('.voice-controls__speaker-icon');
      expect(speakerIcon).toHaveClass('voice-controls__speaker-icon--speaking');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--disabled');
      expect(speakerIcon).not.toHaveClass('voice-controls__speaker-icon--enabled');
    });
  });

  describe('independent toggling (VAL-VOICE-006)', () => {
    it('voice input can be enabled without voice output', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', { name: /voice input/ });
      fireEvent.click(micBtn);

      const state = useVoiceStore.getState();
      expect(state.voiceInputEnabled).toBe(true);
      expect(state.voiceOutputEnabled).toBe(false);
    });

    it('voice output can be enabled without voice input', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const speakerBtn = screen.getByRole('button', { name: /voice output/ });
      fireEvent.click(speakerBtn);

      const state = useVoiceStore.getState();
      expect(state.voiceInputEnabled).toBe(false);
      expect(state.voiceOutputEnabled).toBe(true);
    });

    it('both can be enabled simultaneously', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const micBtn = screen.getByRole('button', { name: /voice input/ });
      const speakerBtn = screen.getByRole('button', { name: /voice output/ });

      fireEvent.click(micBtn);
      fireEvent.click(speakerBtn);

      const state = useVoiceStore.getState();
      expect(state.voiceInputEnabled).toBe(true);
      expect(state.voiceOutputEnabled).toBe(true);
    });

    it('both can be disabled', () => {
      render(
        <VoiceControls
          onTranscript={mockOnTranscript}
          onSpeechEnd={mockOnSpeechEnd}
        />,
      );

      const state = useVoiceStore.getState();
      expect(state.voiceInputEnabled).toBe(false);
      expect(state.voiceOutputEnabled).toBe(false);
    });
  });
});
