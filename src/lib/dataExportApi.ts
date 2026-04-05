/**
 * API client for data export/import endpoints
 */

const BASE_URL = '/api/export';

export interface ExportData {
  version: string;
  exportDate: string;
  profiles: unknown[];
  sessions: unknown[];
  messages: unknown[];
  actionItems: unknown[];
  content: unknown[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    profiles: number;
    sessions: number;
    messages: number;
    actionItems: number;
  };
}

export interface ClearDataResult {
  success: boolean;
  cleared: {
    profiles: number;
    sessions: number;
    messages: number;
    actionItems: number;
  };
}

export class DataExportImportAPIClient {
  /**
   * Fetch all data for export
   */
  async exportData(): Promise<ExportData> {
    const response = await fetch(BASE_URL);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to export data: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Import data from JSON
   */
  async importData(data: Record<string, unknown>): Promise<ImportResult> {
    const response = await fetch(`${BASE_URL}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to import data: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Clear all user data
   */
  async clearData(): Promise<ClearDataResult> {
    const response = await fetch(`${BASE_URL}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to clear data: ${response.status}`);
    }

    return response.json();
  }
}

export const dataExportAPI = new DataExportImportAPIClient();
