/**
 * Settings page: Model selection, data export, import, and clear functionality
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataExportAPI } from '../lib/dataExportApi';
import { settingsAPI } from '../lib/settingsApi';
import type { SettingsResponse } from '../lib/settingsApi';
import { useToastStore } from '../stores/toastStore';
import { useProfileStore } from '../stores/profileStore';
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

  /**
   * Load settings on mount
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.getSettings();
        setSettingsData(data);
        setSelectedModel(data.selectedModel);
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

    loadSettings();
  }, [addToast]);

  /**
   * Handle model selection change
   */
  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value;
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
                  Recommended: {settingsData.systemInfo.recommendedModelDescription}
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
                aria-describedby="model-selection-help"
              >
                {isSavingModel ? (
                  <option value="">Updating model...</option>
                ) : settingsData?.ollamaOnline ? (
                  settingsData.installedModels.map((model) => (
                    <option key={model} value={model}>
                      {selectedModel === model ? `✓ ${model}` : model}
                    </option>
                  ))
                ) : (
                  <option value={selectedModel}>{selectedModel} (Ollama offline)</option>
                )}
              </select>
              <p id="model-selection-help" className="model-selection__help">
                {!settingsData?.ollamaOnline &&
                  'Ollama is offline. Install more models with `ollama pull <model>` to see them here.'}
                {settingsData?.ollamaOnline && settingsData.installedModels.length === 0 &&
                  'No models installed. Install a model with `ollama pull <model>`.'}
                {settingsData?.ollamaOnline && settingsData.installedModels.length > 0 &&
                  'Changes take effect on your next meditation session.'}
              </p>
            </div>
          </>
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
