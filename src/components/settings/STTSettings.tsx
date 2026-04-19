/**
 * STT Settings Component
 * Handles speech-to-text model selection.
 * Model reloads automatically when selection changes.
 */

import type { STTSettingsProps } from './types';

export function STTSettings({
  sttModels,
  isLoadingSttModels,
  selectedSttModel,
  isReloadingStt,
  showSttWarning,
  onSttModelChange,
  onSttWarningDismiss,
}: STTSettingsProps) {
  if (isLoadingSttModels) {
    return (
      <div className="loading-spinner" role="status" aria-label="Loading STT models">
        Loading STT models...
      </div>
    );
  }

  return (
    <div className="stt-settings">
      {/* Model Selection */}
      <div className="stt-settings__control">
        <label htmlFor="stt-model-select" className="stt-settings__label">
          Model
        </label>
        <select
          id="stt-model-select"
          className="stt-settings__dropdown"
          value={selectedSttModel}
          onChange={onSttModelChange}
          disabled={isReloadingStt}
          aria-describedby="stt-model-help"
        >
          <option value="">Select a model...</option>
          {sttModels.map((model) => (
            <option key={model.name} value={model.name}>
              {selectedSttModel === model.name
                ? `✓ ${model.name}`
                : model.name} (~{model.memoryMB}MB RAM)
            </option>
          ))}
        </select>
        <p id="stt-model-help" className="stt-settings__help">
          {isReloadingStt
            ? 'Loading model...'
            : 'Select the Whisper model for speech recognition. Larger models are more accurate but require more memory. Changes take effect immediately.'}
        </p>
      </div>

      {/* Warning for larger models */}
      {showSttWarning && (
        <div className="stt-settings__warning" role="alert">
          <span className="stt-settings__warning-icon">⚠️</span>
          <span className="stt-settings__warning-text">
            Switching to a larger model may increase memory usage and slow down transcription.
          </span>
          <button
            type="button"
            className="stt-settings__warning-dismiss"
            onClick={onSttWarningDismiss}
            aria-label="Dismiss warning"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}