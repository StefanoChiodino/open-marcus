/**
 * STT Settings Component
 * Handles speech-to-text model selection and reload functionality
 */

import type { STTSettingsProps } from './types';

export function STTSettings({
  sttModels,
  isLoadingSttModels,
  selectedSttModel,
  isReloadingStt,
  showSttWarning,
  onSttModelChange,
  onSttReload,
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
        >
          <option value="">Select a model...</option>
          {sttModels.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} (~{model.memoryMB}MB RAM)
            </option>
          ))}
        </select>
        <p className="stt-settings__help">
          Select the Whisper model for speech recognition. Larger models are more accurate but require more memory.
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

      {/* Reload Button */}
      <div className="stt-settings__control">
        <button
          type="button"
          className="button button--secondary"
          onClick={onSttReload}
          disabled={isReloadingStt || !selectedSttModel}
          aria-busy={isReloadingStt}
        >
          {isReloadingStt ? (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              Reloading Model...
            </>
          ) : (
            'Reload Model'
          )}
        </button>
      </div>
    </div>
  );
}