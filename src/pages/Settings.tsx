/**
 * Settings page: Model selection, data export, import, and clear functionality
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataExportAPI } from '../lib/dataExportApi';
import { settingsAPI, TTS_VOICES, TtsVoice, TTS_MIN_RATE, TTS_MAX_RATE, TTS_MIN_PITCH, TTS_MAX_PITCH, SttModelInfo } from '../lib/settingsApi';
import type { SettingsResponse } from '../lib/settingsApi';
import { useToastStore } from '../stores/toastStore';
import { useProfileStore } from '../stores/profileStore';
import { useTTSStore } from '../stores/ttsSettingsStore';
import ConfirmationModal from '../components/ConfirmationModal';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);
  const clearProfile = useProfileStore((state) => state.clearProfile);
  const loadProfile = useProfileStore((state) => state.loadProfile);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data management state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Model selection state
  const [settingsData, setSettingsData] = useState<SettingsResponse | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

  // TTS settings state
  const [selectedVoice, setSelectedVoice] = useState<TtsVoice>('en-US-GuyNeural');
  const [rateValue, setRateValue] = useState(25); // default +25%
  const [pitchValue, setPitchValue] = useState(0); // default +0Hz
  const [isSavingTts, setIsSavingTts] = useState(false);

  // STT settings state
  const [sttModels, setSttModels] = useState<SttModelInfo[]>([]);
  const [selectedSttModel, setSelectedSttModel] = useState('');
  const [isLoadingSttModels, setIsLoadingSttModels] = useState(true);
  const [isReloadingStt, setIsReloadingStt] = useState(false);
  const [showSttWarning, setShowSttWarning] = useState(false);

  /**
   * Load settings and STT models on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.getSettings();
        setSettingsData(data);
        setSelectedModel(data.selectedModel);
        // Set TTS settings from API response
        setSelectedVoice(data.ttsVoice as TtsVoice);
        // Parse rate value from string like "+25%" to number 25
        const rateMatch = data.ttsRate.match(/^([+-]?\d+)%$/);
        if (rateMatch) {
          setRateValue(parseInt(rateMatch[1], 10));
        }
        // Parse pitch value from string like "+0Hz" to number 0
        const pitchMatch = data.ttsPitch.match(/^([+-]?\d+)Hz$/);
        if (pitchMatch) {
          setPitchValue(parseInt(pitchMatch[1], 10));
        }
        // Set STT model from settings
        if (data.sttModel) {
          setSelectedSttModel(data.sttModel);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load settings';
        addToast({
          type: 'error',
          title: 'Settings load failed',
          message,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    const loadSttModels = async () => {
      try {
        const models = await settingsAPI.getSttModels();
        setSttModels(models);
      } catch (error) {
        console.error('Failed to load STT models:', error);
      } finally {
        setIsLoadingSttModels(false);
      }
    };

    loadSettings();
    loadSttModels();
  }, [addToast]);

  /**
   * Handle model selection change
   */
  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    
    // Check if this model is installed
    const isInstalled = settingsData?.installedModels.includes(newModel) ?? false;

    if (!isInstalled) {
      // Model not installed - start download
      setDownloadingModel(newModel);
      setDownloadProgress(0);
      setDownloadStatus('Starting download...');
      setIsSavingModel(true);
      
      try {
        const stream = settingsAPI.pullModel(newModel);
        const reader = stream.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          setDownloadProgress(value.percent ?? 0);
          if (value.status) {
            setDownloadStatus(value.status === 'success' ? 'Download complete!' : value.status);
          }
          if (value.message) {
            setDownloadStatus(value.message);
          }
        }
        
        // Download complete - now save the model selection
        setDownloadStatus('Saving selection...');
        const updated = await settingsAPI.updateSettings({ selectedModel: newModel });
        setSettingsData(updated);
        
        addToast({
          type: 'success',
          title: 'Model ready',
          message: `${newModel} downloaded and selected. Changes take effect on next session.`,
        });
        
        // Refresh to update installed models list
        const refreshedData = await settingsAPI.getSettings();
        setSettingsData(refreshedData);
        setSelectedModel(newModel);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to download model';
        addToast({
          type: 'error',
          title: 'Download failed',
          message,
        });
        // Revert to previous value
        setSelectedModel(settingsData?.selectedModel || '');
      } finally {
        setDownloadingModel(null);
        setDownloadProgress(0);
        setDownloadStatus('');
        setIsSavingModel(false);
      }
    } else {
      // Model is already installed - just save selection
      setSelectedModel(newModel);
      setIsSavingModel(true);
      try {
        const updated = await settingsAPI.updateSettings({ selectedModel: newModel });
        setSettingsData(updated);
        addToast({
          type: 'success',
          title: 'Model updated',
          message: `Now using ${newModel}. Changes take effect on next session.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update model';
        addToast({
          type: 'error',
          title: 'Model update failed',
          message,
        });
        // Revert to previous value
        setSelectedModel(settingsData?.selectedModel || '');
      } finally {
        setIsSavingModel(false);
      }
    }
  };

  /**
   * Handle TTS voice selection change
   */
  const handleVoiceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVoice = event.target.value as TtsVoice;
    setSelectedVoice(newVoice);

    setIsSavingTts(true);
    try {
      const updated = await settingsAPI.updateSettings({ ttsVoice: newVoice });
      setSettingsData(updated);
      useTTSStore.getState().updateSettings({ voice: updated.ttsVoice });
      addToast({
        type: 'success',
        title: 'Voice updated',
        message: `Now using ${newVoice}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update voice';
      addToast({
        type: 'error',
        title: 'Voice update failed',
        message,
      });
      // Revert to previous value
      setSelectedVoice(settingsData?.ttsVoice as TtsVoice || 'en-US-GuyNeural');
    } finally {
      setIsSavingTts(false);
    }
  };

  /**
   * Handle TTS rate slider change
   */
  const handleRateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseInt(event.target.value, 10);
    setRateValue(newRate);

    // Format rate as percentage string: "+25%" or "-10%"
    const rateString = newRate >= 0 ? `+${newRate}%` : `${newRate}%`;

    setIsSavingTts(true);
    try {
      const updated = await settingsAPI.updateSettings({ ttsRate: rateString });
      setSettingsData(updated);
      useTTSStore.getState().updateSettings({ rate: updated.ttsRate });
      addToast({
        type: 'success',
        title: 'Rate updated',
        message: `Speech rate set to ${rateString}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update rate';
      addToast({
        type: 'error',
        title: 'Rate update failed',
        message,
      });
      // Revert to previous value from settingsData
      const prevRate = settingsData?.ttsRate || '+25%';
      const prevRateMatch = prevRate.match(/^([+-]?\d+)%$/);
      if (prevRateMatch) {
        setRateValue(parseInt(prevRateMatch[1], 10));
      }
    } finally {
      setIsSavingTts(false);
    }
  };

  /**
   * Handle TTS pitch slider change
   */
  const handlePitchChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseInt(event.target.value, 10);
    setPitchValue(newPitch);

    // Format pitch as Hz string: "+0Hz" or "-10Hz"
    const pitchString = newPitch >= 0 ? `+${newPitch}Hz` : `${newPitch}Hz`;

    setIsSavingTts(true);
    try {
      const updated = await settingsAPI.updateSettings({ ttsPitch: pitchString });
      setSettingsData(updated);
      useTTSStore.getState().updateSettings({ pitch: updated.ttsPitch });
      addToast({
        type: 'success',
        title: 'Pitch updated',
        message: `Speech pitch set to ${pitchString}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update pitch';
      addToast({
        type: 'error',
        title: 'Pitch update failed',
        message,
      });
      // Revert to previous value from settingsData
      const prevPitch = settingsData?.ttsPitch || '+0Hz';
      const prevPitchMatch = prevPitch.match(/^([+-]?\d+)Hz$/);
      if (prevPitchMatch) {
        setPitchValue(parseInt(prevPitchMatch[1], 10));
      }
    } finally {
      setIsSavingTts(false);
    }
  };

  /**
   * Handle STT model selection change
   */
  const handleSttModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    const prevModel = selectedSttModel;

    // Show warning if switching to a larger model
    if (newModel && prevModel) {
      const newModelInfo = sttModels.find((m) => m.name === newModel);
      const prevModelInfo = sttModels.find((m) => m.name === prevModel);
      if (newModelInfo && prevModelInfo && newModelInfo.memoryMB > prevModelInfo.memoryMB) {
        setShowSttWarning(true);
      } else {
        setShowSttWarning(false);
      }
    } else {
      setShowSttWarning(false);
    }

    setSelectedSttModel(newModel);

    // If model is selected, save the selection
    if (newModel) {
      try {
        const updated = await settingsAPI.updateSettings({ sttModel: newModel });
        setSettingsData(updated);
        addToast({
          type: 'success',
          title: 'STT model saved',
          message: `Selected ${newModel}. Click "Reload Model" to activate.`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save STT model';
        addToast({
          type: 'error',
          title: 'Save failed',
          message,
        });
        setSelectedSttModel(prevModel);
      }
    }
  };

  /**
   * Handle STT model reload
   */
  const handleSttReload = async () => {
    if (!selectedSttModel) return;

    setIsReloadingStt(true);
    setShowSttWarning(false);

    try {
      await settingsAPI.reloadSttModel(selectedSttModel);
      addToast({
        type: 'success',
        title: 'Model reloaded',
        message: `${selectedSttModel} is now active.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reload STT model';
      addToast({
        type: 'error',
        title: 'Reload failed',
        message,
      });
    } finally {
      setIsReloadingStt(false);
    }
  };

  /**
   * Export all data as JSON file download
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await dataExportAPI.exportData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openmarcus-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Data exported',
        message: 'Your data has been downloaded as a JSON file.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export data';
      addToast({
        type: 'error',
        title: 'Export failed',
        message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Import data from a JSON file
   */
  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const fileContent = await file.text();
      const data = JSON.parse(fileContent);

      await dataExportAPI.importData(data);

      // Refresh local state
      await loadProfile();

      addToast({
        type: 'success',
        title: 'Data imported',
        message: `Restored ${data.profiles?.length || 0} profile(s), ${data.sessions?.length || 0} session(s).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import data';
      addToast({
        type: 'error',
        title: 'Import failed',
        message,
      });
    } finally {
      setIsImporting(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerImportFile = () => {
    fileInputRef.current?.click();
  };

  /**
   * Clear all data with confirmation
   */
  const handleClearData = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);
    try {
      const result = await dataExportAPI.clearData();

      // Clear local state
      clearProfile();

      addToast({
        type: 'success',
        title: 'All data cleared',
        message: `Cleared ${result.cleared.profiles} profile(s), ${result.cleared.sessions} session(s).`,
      });

      // Navigate to home which will redirect to onboarding
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear data';
      addToast({
        type: 'error',
        title: 'Clear data failed',
        message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="settings-page page-container" role="main" aria-label="Settings">
      <h2 className="settings-page__title" id="settings-title">Settings</h2>
      <p className="settings-page__description">
        Manage your data: export, import, or clear all your OpenMarcus data.
      </p>

      {/* Model Selection Section */}
      <section className="settings-section" aria-labelledby="model-heading">
        <h3 className="settings-section__title" id="model-heading">AI Model Selection</h3>

        {isLoadingSettings ? (
          <div className="loading-spinner" role="status" aria-label="Loading settings">
            Loading settings...
          </div>
        ) : (
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
                onChange={handleModelChange}
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
                <strong>About model size and RAM:</strong> The size shown next to each model (e.g., "~2 GB RAM") is an estimate of how much memory the model needs when running. This includes the model weights, plus working memory for processing. You are responsible for ensuring you have enough RAM available on your computer before selecting a model. Larger models generally provide better responses but require more memory. If you're unsure, choose a smaller model or one recommended for your system's RAM.</p>
            </div>
          </>
        )}
      </section>

      {/* Voice Output Section */}
      <section className="settings-section" aria-labelledby="tts-heading">
        <h3 className="settings-section__title" id="tts-heading">Voice Output</h3>

        {isLoadingSettings ? (
          <div className="loading-spinner" role="status" aria-label="Loading TTS settings">
            Loading TTS settings...
          </div>
        ) : (
          <div className="tts-settings">
            {/* Voice Selection */}
            <div className="tts-settings__control">
              <label htmlFor="tts-voice-select" className="tts-settings__label">
                Voice
              </label>
              <select
                id="tts-voice-select"
                className="tts-settings__dropdown"
                value={selectedVoice}
                onChange={handleVoiceChange}
                disabled={isSavingTts}
              >
                {TTS_VOICES.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))}
              </select>
              <p className="tts-settings__help">
                Select the voice used for text-to-speech output during meditation sessions.
              </p>
            </div>

            {/* Rate Slider */}
            <div className="tts-settings__control">
              <label htmlFor="tts-rate-slider" className="tts-settings__label">
                Speed: <span className="tts-settings__value">{rateValue >= 0 ? `+${rateValue}%` : `${rateValue}%`}</span>
              </label>
              <div className="tts-settings__slider-container">
                <span className="tts-settings__slider-range">{TTS_MIN_RATE}%</span>
                <input
                  id="tts-rate-slider"
                  type="range"
                  className="tts-settings__slider"
                  min={TTS_MIN_RATE}
                  max={TTS_MAX_RATE}
                  value={rateValue}
                  onChange={handleRateChange}
                  disabled={isSavingTts}
                  aria-describedby="tts-rate-help"
                />
                <span className="tts-settings__slider-range">{TTS_MAX_RATE}%</span>
              </div>
              <p id="tts-rate-help" className="tts-settings__help">
                Adjust speech speed. Default is +25% (faster than normal).
              </p>
            </div>

            {/* Pitch Slider */}
            <div className="tts-settings__control">
              <label htmlFor="tts-pitch-slider" className="tts-settings__label">
                Pitch: <span className="tts-settings__value">{pitchValue >= 0 ? `+${pitchValue}Hz` : `${pitchValue}Hz`}</span>
              </label>
              <div className="tts-settings__slider-container">
                <span className="tts-settings__slider-range">{TTS_MIN_PITCH}Hz</span>
                <input
                  id="tts-pitch-slider"
                  type="range"
                  className="tts-settings__slider"
                  min={TTS_MIN_PITCH}
                  max={TTS_MAX_PITCH}
                  value={pitchValue}
                  onChange={handlePitchChange}
                  disabled={isSavingTts}
                  aria-describedby="tts-pitch-help"
                />
                <span className="tts-settings__slider-range">+{TTS_MAX_PITCH}Hz</span>
              </div>
              <p id="tts-pitch-help" className="tts-settings__help">
                Adjust speech pitch. Default is +0Hz (natural pitch).
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Speech Recognition (STT) Section */}
      <section className="settings-section" aria-labelledby="stt-heading">
        <h3 className="settings-section__title" id="stt-heading">Speech Recognition (STT)</h3>

        {isLoadingSttModels ? (
          <div className="loading-spinner" role="status" aria-label="Loading STT models">
            Loading STT models...
          </div>
        ) : (
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
                onChange={handleSttModelChange}
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
              </div>
            )}

            {/* Reload Button */}
            <div className="stt-settings__control">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleSttReload}
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
        )}
      </section>

      {/* Export Section */}
      <section className="settings-section" aria-labelledby="export-heading">
        <h3 className="settings-section__title" id="export-heading">Export Data</h3>
        <p className="settings-section__description">
          Download all your profiles, sessions, messages, and settings as a JSON file.
        </p>
        <div className="settings-section__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={handleExport}
            disabled={isExporting}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              'Download JSON Export'
            )}
          </button>
        </div>
      </section>

      {/* Import Section */}
      <section className="settings-section" aria-labelledby="import-heading">
        <h3 className="settings-section__title" id="import-heading">Import Data</h3>
        <p className="settings-section__description">
          Restore your data from a previously exported JSON file. This will replace all current data.
        </p>
        <div className="settings-section__actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={triggerImportFile}
            disabled={isImporting}
            aria-busy={isImporting}
          >
            {isImporting ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Importing...
              </>
            ) : (
              'Import from JSON File'
            )}
          </button>
        </div>
      </section>

      {/* Clear Data Section */}
      <section className="settings-section settings-section--danger" aria-labelledby="clear-heading">
        <h3 className="settings-section__title" id="clear-heading">Clear All Data</h3>
        <p className="settings-section__description">
          Permanently delete all your profiles, sessions, messages, and settings. This action cannot be undone.
        </p>
        <div className="settings-section__actions">
          <button
            type="button"
            className="button button--danger"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            aria-label="Permanently delete all your profiles, sessions, messages, and settings"
          >
            Clear All Data
          </button>
        </div>
      </section>

      {/* Clear Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Clear All Data?"
        message="This will permanently delete all your profiles, meditation sessions, messages, and settings. This action cannot be undone. Are you sure you want to continue?"
        confirmText="Yes, Clear Everything"
        cancelText="Cancel"
        onConfirm={handleClearData}
        onCancel={() => setShowClearConfirm(false)}
        danger
      />
    </div>
  );
}

export default Settings;
