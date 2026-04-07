/**
 * Model Selection Component
 * Handles AI model selection, download, and RAM information display
 */

import type { ModelSelectionProps } from './types';

export function ModelSelection({
  settingsData,
  isLoadingSettings,
  isSavingModel,
  selectedModel,
  downloadingModel,
  downloadProgress,
  downloadStatus,
  onModelChange,
}: ModelSelectionProps) {
  if (isLoadingSettings) {
    return (
      <div className="loading-spinner" role="status" aria-label="Loading settings">
        Loading settings...
      </div>
    );
  }

  return (
    <>
      {/* System RAM and Recommendation */}
      {settingsData?.systemInfo && (
        <div className="model-selection__system-info">
          <span className="model-selection__ram">
            System RAM: {settingsData.systemInfo.totalRamGB} GB
          </span>
          <span className="model-selection__recommendation" aria-label="Recommended model">
            Recommended: {settingsData.systemInfo.recommendedTierDescription}
          </span>
        </div>
      )}

      {/* Model Selector */}
      <div className="model-selection__controls">
        <label htmlFor="model-select" className="model-selection__label">
          Active Model
        </label>
        <select
          id="model-select"
          className="model-selection__dropdown"
          value={selectedModel}
          onChange={onModelChange}
          disabled={isSavingModel || (!settingsData?.ollamaOnline && settingsData?.installedModels.length === 0)}
          aria-describedby="model-selection-help model-ram-explanation"
        >
          {isSavingModel && !downloadingModel ? (
            <option value="">Updating model...</option>
          ) : (
            <>
              {/* Show installed models with RAM usage */}
              {settingsData?.installedModelsInfo.map((modelInfo) => (
                <option key={modelInfo.name} value={modelInfo.name}>
                  {selectedModel === modelInfo.name
                    ? `✓ ${modelInfo.name}`
                    : modelInfo.name} ({modelInfo.ramUsageLabel})
                </option>
              ))}
              {/* Show recommended models that aren't installed yet - marked with download icon */}
              {settingsData && settingsData.recommendedModelsInfo && settingsData.recommendedModelsInfo.length > 0 && (
                <optgroup label="Available to download">
                  {settingsData.recommendedModelsInfo.map((modelInfo) => (
                    <option key={modelInfo.name} value={modelInfo.name}>
                      {downloadingModel === modelInfo.name
                        ? `↓ ${modelInfo.name} (${downloadProgress}%)`
                        : `↓ ${modelInfo.name} (${modelInfo.ramUsageLabel}) - Click to download`}
                    </option>
                  ))}
                </optgroup>
              )}
            </>
          )}
        </select>

        {/* Download Progress Bar */}
        {downloadingModel && (
          <div className="model-selection__download-progress" role="status" aria-live="polite">
            <div className="model-selection__download-info">
              <span className="model-selection__download-model">{downloadingModel}</span>
              <span className="model-selection__download-status">{downloadStatus}</span>
            </div>
            <div className="model-selection__progress-bar">
              <div
                className="model-selection__progress-fill"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <span className="model-selection__download-percent">{downloadProgress}%</span>
          </div>
        )}

        <p id="model-selection-help" className="model-selection__help">
          {!settingsData?.ollamaOnline && settingsData?.installedModels.length === 0 &&
            'Ollama is offline. Please start Ollama to manage models.'}
          {settingsData?.ollamaOnline && settingsData.installedModels.length === 0 &&
            'No models installed. Select a model below to download it automatically.'}
          {settingsData?.ollamaOnline && settingsData.installedModels.length > 0 &&
            'Select an installed model or choose a recommended one below. Changes take effect on your next meditation session.'}
        </p>
        <p id="model-ram-explanation" className="model-selection__ram-explanation">
          <strong>About model size and RAM:</strong> The size shown next to each model (e.g., "~2 GB RAM") is an estimate of how much memory the model needs when running. This includes the model weights, plus working memory for processing. You are responsible for ensuring you have enough RAM available on your computer before selecting a model. Larger models generally provide better responses but require more memory. If you're unsure, choose a smaller model or one recommended for your system's RAM.
        </p>
      </div>
    </>
  );
}