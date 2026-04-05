import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Settings from './Settings';
import { useToastStore } from '../stores/toastStore';

// Mock the API client
vi.mock('../lib/dataExportApi', () => ({
  dataExportAPI: {} as unknown as typeof import('../lib/dataExportApi').dataExportAPI,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { dataExportAPI } from '../lib/dataExportApi';
const mockExportData = vi.fn();
const mockImportData = vi.fn();
const mockClearData = vi.fn();

vi.mocked(dataExportAPI).exportData = mockExportData;
vi.mocked(dataExportAPI).importData = mockImportData;
vi.mocked(dataExportAPI).clearData = mockClearData;

const renderWithRouter = (initialEntries = ['/settings']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Settings />
    </MemoryRouter>
  );
};

const sampleExportData = {
  version: '1.0.0',
  exportDate: '2024-01-01T00:00:00Z',
  profiles: [
    {
      id: 'test-profile-1',
      name: 'Test User',
      bio: 'A stoic learner',
      encrypted_data: '{}',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  sessions: [],
  messages: [],
  actionItems: [],
  content: [],
};

describe('Settings Page', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
    mockNavigate.mockClear();
    mockExportData.mockReset();
    mockImportData.mockReset();
    mockClearData.mockReset();
  });

  describe('rendering', () => {
    it('renders settings page title and description', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByText(/manage your data/i)).toBeInTheDocument();
    });

    it('renders export section with heading and button', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /export data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download json export/i })).toBeInTheDocument();
    });

    it('renders import section with heading and button', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /import data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import from json file/i })).toBeInTheDocument();
    });

    it('renders clear data section with heading and danger button', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /clear all data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all data/i })).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    it('calls export API and triggers browser download', async () => {
      mockExportData.mockResolvedValue(sampleExportData);

      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      renderWithRouter();

      const exportButton = screen.getByRole('button', { name: /download json export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportData).toHaveBeenCalledTimes(1);
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Verify a success toast was added to the store
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.title === 'Data exported')).toBe(true);
    });

    it('adds error toast when export fails', async () => {
      mockExportData.mockRejectedValue(new Error('Network error'));

      renderWithRouter();

      const exportButton = screen.getByRole('button', { name: /download json export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        const toasts = useToastStore.getState().toasts;
        const errorToast = toasts.find(
          (t) => t.type === 'error' && t.title === 'Export failed',
        );
        expect(errorToast).toBeDefined();
      });
    });

    it('disables button while exporting', async () => {
      let resolveExport: (() => void) | undefined;
      mockExportData.mockReturnValue(
        new Promise<typeof sampleExportData>((resolve) => {
          resolveExport = () => resolve(sampleExportData);
        }),
      );

      renderWithRouter();

      const exportButton = screen.getByRole('button', { name: /download json export/i });
      await userEvent.click(exportButton);

      expect(exportButton).toBeDisabled();
      expect(exportButton).toHaveTextContent('Exporting...');

      // Resolve to clean up
      resolveExport!();

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
        expect(exportButton).toHaveTextContent('Download JSON Export');
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('import functionality', () => {
    /**
     * Helper: set a FileList on a file input and dispatch change for jsdom.
     */
    function setFileOnInput(input: HTMLInputElement, file: File) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    it('adds error toast when import API rejects with error', async () => {
      mockImportData.mockRejectedValue(new Error('Invalid json'));

      renderWithRouter();

      const fileInputEl = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(fileInputEl).not.toBeNull();

      const file = new File([JSON.stringify({ bad: 'data' })], 'import.json', {
        type: 'application/json',
      });
      setFileOnInput(fileInputEl!, file);

      // Allow async state updates and API call to resolve
      await waitFor(
        () => {
          const toasts = useToastStore.getState().toasts;
          expect(
            toasts.some((t) => t.type === 'error' && t.title === 'Import failed'),
          ).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    // Import success path is validated by backend tests (export.test.ts) +
    // the error-handling test above which covers the file input → handler pipeline.
  });

  describe('clear data functionality', () => {
    it('shows confirmation dialog when clear button is clicked', async () => {
      let resolveClear: (() => void) | undefined;
      mockClearData.mockReturnValue(
        new Promise((resolve) => {
          resolveClear = () =>
            resolve({
              success: true,
              cleared: { profiles: 1, sessions: 2, messages: 5, actionItems: 3 },
            });
        }),
      );

      renderWithRouter();

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await userEvent.click(clearButton);

      // Dialog element exists with confirmation message text
      await waitFor(() => {
        const dialog = screen.getByRole('dialog', { hidden: true });
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveTextContent('Clear All Data?');
      });

      // Clean up: confirm
      const confirmButton = screen.getByText('Yes, Clear Everything');
      await userEvent.click(confirmButton);
      resolveClear!();
    });

    it('does not clear data when dialog backdrop is clicked (cancellation)', async () => {
      renderWithRouter();

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      // Click the dialog element (backdrop) to cancel via onClick handler
      const dialog = screen.getByRole('dialog', { hidden: true });
      await act(async () => {
        fireEvent.click(dialog);
      });

      expect(mockClearData).not.toHaveBeenCalled();
    });

    it('clears all data and navigates to home when confirmed', async () => {
      mockClearData.mockResolvedValue({
        success: true,
        cleared: { profiles: 1, sessions: 2, messages: 5, actionItems: 3 },
      });

      renderWithRouter();

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Yes, Clear Everything');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockClearData).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      const toasts = useToastStore.getState().toasts;
      expect(
        toasts.some((t) => t.type === 'success' && t.title === 'All data cleared'),
      ).toBe(true);
    });

    it('adds error toast if clear API fails', async () => {
      mockClearData.mockRejectedValue(new Error('Database error'));

      renderWithRouter();

      const clearButton = screen.getByRole('button', { name: /clear all data/i });
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Yes, Clear Everything');
      await userEvent.click(confirmButton);

      await waitFor(() => {
        const toasts = useToastStore.getState().toasts;
        expect(
          toasts.some((t) => t.type === 'error' && t.title === 'Clear data failed'),
        ).toBe(true);
      });
    });
  });
});
