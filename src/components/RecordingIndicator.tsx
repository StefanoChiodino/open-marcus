import './VoiceControls.css';

export interface RecordingIndicatorProps {
  /** Whether recording is in progress */
  isRecording: boolean;
  /** Status text to display alongside the indicator */
  statusText?: string;
}

/**
 * RecordingIndicator - Visual indicator shown while recording voice input
 * Shows a pulsing red dot with status text
 */
function RecordingIndicator({ isRecording, statusText = 'Recording...' }: RecordingIndicatorProps) {
  if (!isRecording) return null;

  return (
    <div
      className="recording-indicator"
      role="status"
      aria-live="polite"
      aria-label={statusText}
    >
      <span className="recording-indicator__dot" aria-hidden="true" />
      <span className="recording-indicator__text">{statusText}</span>
    </div>
  );
}

export default RecordingIndicator;
