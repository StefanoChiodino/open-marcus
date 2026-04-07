/**
 * Settings page: Model selection, data export, import, and clear functionality
 * Refactored to use sub-components for better maintainability
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataExportAPI } from '../lib/dataExportApi';
import { settingsAPI } from '../lib/settingsApi';
import type { TtsVoice, SettingsResponse } from '../lib/settingsApi';
import { useToastStore } from '../stores/toastStore';
import { useProfileStore } from '../stores/profileStore';
import { useTTSStore } from '../stores/ttsSettingsStore';
import { ModelSelection, TTSSettings, STTSettings, DataManagement } from '../components/settings';
import type { ModelSelectionProps, TTSSettingsProps, STTSettingsProps, DataManagementProps } from '../components/settings';
import './Settings.css';

/**
 * Main Settings component
 * Coordinates state and handlers for all settings sub-components
 */
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
  const [sttModels, setSttModels] = useState<import('../lib/settingsApi').SttModelInfo[]>([]);
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

  // ============ Model Selection Handlers ============

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
          message: `${newModel} is now active. Changes take effect on next session.`,
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

  // ============ TTS Handlers ============

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
      // Revert to previous value (parse current rate from settings)
      const currentRate = settingsData?.ttsRate.match(/^([+-]?\d+)%$/)?.[1] || '25';
      setRateValue(parseInt(currentRate, 10));
    } finally {
      setIsSavingTts(false);
    }
  };

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
      // Revert to previous value
      const currentPitch = settingsData?.ttsPitch.match(/^([+-]?\d+)Hz$/)?.[1] || '0';
      setPitchValue(parseInt(currentPitch, 10));
    } finally {
      setIsSavingTts(false);
    }
  };

  // ============ STT Handlers ============

  const handleSttModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
    setSelectedSttModel(newModel);
    
    // Show warning for larger models (> 500MB)
    const selectedModelInfo = sttModels.find(m => m.name === newModel);
    if (selectedModelInfo && selectedModelInfo.memoryMB > 500) {
      setShowSttWarning(true);
    } else {
      setShowSttWarning(false);
    }

    setIsSavingModel(true);
    try {
      const updated = await settingsAPI.updateSettings({ sttModel: newModel });
      setSettingsData(updated);
      addToast({
        type: 'success',
        title: 'STT model updated',
        message: `${newModel} is now active.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update STT model';
      addToast({
        type: 'error',
        title: 'STT model update failed',
        message,
      });
      // Revert to previous value
      setSelectedSttModel(settingsData?.sttModel || '');
    } finally {
      setIsSavingModel(false);
    }
  };

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

  const handleSttWarningDismiss = () => {
    setShowSttWarning(false);
  };

  // ============ Data Management Handlers ============

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

  const handleClearRequest = () => {
    setShowClearConfirm(true);
  };

  const handleClearConfirm = async () => {
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

  const handleClearCancel = () => {
    setShowClearConfirm(false);
  };

  // ============ Props for Sub-components ============

  const modelSelectionProps: ModelSelectionProps = {
    settingsData,
    isLoadingSettings,
    isSavingModel,
    selectedModel,
    downloadingModel,
    downloadProgress,
    downloadStatus,
    onModelChange: handleModelChange,
  };

  const ttsSettingsProps: TTSSettingsProps = {
    settingsData,
    isLoadingSettings,
    isSavingTts,
    selectedVoice,
    rateValue,
    pitchValue,
    onVoiceChange: handleVoiceChange,
    onRateChange: handleRateChange,
    onPitchChange: handlePitchChange,
  };

  const sttSettingsProps: STTSettingsProps = {
    sttModels,
    isLoadingSttModels,
    isReloadingStt,
    selectedSttModel,
    showSttWarning,
    onSttModelChange: handleSttModelChange,
    onSttReload: handleSttReload,
    onSttWarningDismiss: handleSttWarningDismiss,
  };

  const dataManagementProps: DataManagementProps = {
    isExporting,
    isImporting,
    isClearing,
    showClearConfirm,
    fileInputRef,
    onExport: handleExport,
    onImportFile: handleImportFile,
    onClearRequest: handleClearRequest,
    onClearConfirm: handleClearConfirm,
    onClearCancel: handleClearCancel,
  };

  // ============ Render ============

  return (
    <div className="settings-page page-container" role="main" aria-label="Settings">
      <h2 className="settings-page__title" id="settings-title">Settings</h2>
      <p className="settings-page__description">
        Manage your data: export, import, or clear all your OpenMarcus data.
      </p>

      {/* Model Selection Section */}
      <section className="settings-section" aria-labelledby="model-heading">
        <h3 className="settings-section__title" id="model-heading">AI Model Selection</h3>
        <ModelSelection {...modelSelectionProps} />
      </section>

      {/* Voice Output Section */}
      <section className="settings-section" aria-labelledby="tts-heading">
        <h3 className="settings-section__title" id="tts-heading">Voice Output</h3>
        <TTSSettings {...ttsSettingsProps} />
      </section>

      {/* Speech Recognition (STT) Section */}
      <section className="settings-section" aria-labelledby="stt-heading">
        <h3 className="settings-section__title" id="stt-heading">Speech Recognition (STT)</h3>
        <STTSettings {...sttSettingsProps} />
      </section>

      {/* Data Management Section */}
      <DataManagement {...dataManagementProps} />
    </div>
  );
}

export default Settings;