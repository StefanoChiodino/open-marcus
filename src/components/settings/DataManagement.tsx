/**
 * Data Management Component
 * Handles data export, import, and clear functionality
 */

import ConfirmationModal from '../ConfirmationModal';
import type { DataManagementProps } from './types';

export function DataManagement({
  isExporting,
  isImporting,
  isClearing,
  showClearConfirm,
  fileInputRef,
  onExport,
  onImportFile,
  onClearRequest,
  onClearConfirm,
  onClearCancel,
}: DataManagementProps) {
  return (
    <>
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
            onClick={onExport}
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
            type="file"
            id="import-file"
            ref={fileInputRef}
            accept=".json"
            onChange={onImportFile}
            disabled={isImporting}
            aria-describedby="import-help"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="button button--secondary"
            onClick={() => fileInputRef.current?.click()}
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
          <p id="import-help" className="settings-section__help">
            Supported format: JSON export file from OpenMarcus
          </p>
        </div>
      </section>

      {/* Clear Data Section */}
      <section className="settings-section settings-section--danger" aria-labelledby="clear-heading">
        <h3 className="settings-section__title" id="clear-heading">Clear All Data</h3>
        <p className="settings-section__description">
          Permanently delete all your profiles, sessions, and settings. This action cannot be undone.
        </p>
        <div className="settings-section__actions">
          <button
            type="button"
            className="button button--danger"
            onClick={onClearRequest}
            disabled={isClearing}
            aria-busy={isClearing}
            aria-label="Permanently delete all your profiles, sessions, messages, and settings"
          >
            {isClearing ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                Clearing...
              </>
            ) : (
              'Clear All Data'
            )}
          </button>
        </div>
      </section>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <ConfirmationModal
          isOpen={showClearConfirm}
          title="Clear All Data?"
          message="This will permanently delete all your profiles, sessions, messages, and settings. This action cannot be undone."
          confirmText="Yes, Clear Everything"
          cancelText="Cancel"
          onConfirm={onClearConfirm}
          onCancel={onClearCancel}
          danger={true}
        />
      )}
    </>
  );
}