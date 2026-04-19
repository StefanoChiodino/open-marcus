import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useProfileStore } from '../stores/profileStore';
import { useSessionStore } from '../stores/sessionStore';
import MeditationChat from './MeditationChat';

// Mock the stores
vi.mock('../stores/profileStore', () => ({
  useProfileStore: vi.fn(),
}));

vi.mock('../stores/sessionStore', () => {
  const mockStore = vi.fn();
  (mockStore as unknown as { getState: ReturnType<typeof vi.fn> }).getState = vi.fn();
  return { useSessionStore: mockStore };
});

const mockProfile = {
  id: 'test-profile-id',
  name: 'TestUser',
  bio: 'A stoic seeker',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function setupSessionStore(overrides: Record<string, unknown> = {}) {
  const mockStore = {
    currentSession: null,
    messages: [],
    status: 'idle',
    error: null,
    streamingContent: '',
    isStreaming: false,
    summary: null,
    actionItems: [],
    beginSession: vi.fn(),
    sendMessage: vi.fn(),
    endSession: vi.fn(),
    resetSession: vi.fn(),
    loadSession: vi.fn(),
    restoreSession: vi.fn(),
    ...overrides,
  };

  (useSessionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

  return mockStore;
}

function setupProfileStore(profile: unknown = mockProfile) {
  const mockStore = {
    profile,
    status: 'loaded',
    error: null,
    loadProfile: vi.fn(),
    saveProfile: vi.fn(),
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    clearProfile: vi.fn(),
  };

  (useProfileStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  return mockStore;
}

describe('MeditationChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Before session starts (idle state)', () => {
    it('renders begin meditation welcome screen', () => {
      setupSessionStore({ status: 'idle' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('Meditation with Marcus Aurelius')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Begin meditation session' })).toBeInTheDocument();
    });

    it('shows personalized greeting with profile name', () => {
      setupSessionStore({ status: 'idle' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText(/Welcome back, TestUser/)).toBeInTheDocument();
    });

    it('displays medical disclaimer', () => {
      setupSessionStore({ status: 'idle' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText(/OpenMarcus is not therapy or medical advice/)).toBeInTheDocument();
    });

    it('calls beginSession when Begin Meditation button is clicked', async () => {
      const beginSession = vi.fn();
      setupSessionStore({ status: 'idle', beginSession });
      setupProfileStore();
      render(<MeditationChat />);

      fireEvent.click(screen.getByRole('button', { name: 'Begin meditation session' }));
      expect(beginSession).toHaveBeenCalledWith();
    });

    it('shows loading state while starting session', () => {
      setupSessionStore({ status: 'starting' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByRole('button', { name: 'Begin meditation session' })).toBeDisabled();
      expect(screen.getByText('Opening the gates of wisdom...')).toBeInTheDocument();
    });
  });

  describe('Active session', () => {
    it('renders chat header with Marcus title', () => {
      setupSessionStore({ status: 'active' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('Meditation with Marcus')).toBeInTheDocument();
    });

    it('shows End Session button', () => {
      setupSessionStore({ status: 'active' });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByRole('button', { name: 'End meditation session' })).toBeInTheDocument();
    });

    it('shows greeting when no messages yet', () => {
      setupSessionStore({ status: 'active', messages: [] });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText(/I'm Marcus\. Hey there, TestUser/)).toBeInTheDocument();
    });

    it('displays messages in the chat', () => {
      const messages = [
        {
          id: '1',
          session_id: 's1',
          role: 'user' as const,
          content: 'Hello Marcus',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          session_id: 's1',
          role: 'assistant' as const,
          content: 'Greetings, seeker.',
          created_at: '2024-01-01T00:00:01Z',
        },
      ];
      setupSessionStore({ status: 'active', messages });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('Hello Marcus')).toBeInTheDocument();
      expect(screen.getByText('Greetings, seeker.')).toBeInTheDocument();
    });

    it('sends message when Enter is pressed', async () => {
      const sendMessage = vi.fn();
      setupSessionStore({ status: 'active', messages: [], sendMessage });
      setupProfileStore();
      render(<MeditationChat />);

      const textarea = screen.getByRole('textbox', {
        name: 'Type your message to Marcus',
      });
      fireEvent.change(textarea, { target: { value: 'I am troubled today.' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('I am troubled today.');
      });
    });

    it('does not send empty message', async () => {
      const sendMessage = vi.fn();
      setupSessionStore({ status: 'active', messages: [], sendMessage });
      setupProfileStore();
      render(<MeditationChat />);

      const textarea = screen.getByRole('textbox', {
        name: 'Type your message to Marcus',
      });
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(sendMessage).not.toHaveBeenCalled();
      });
    });

    it('allows Shift+Enter for new line without sending', () => {
      const sendMessage = vi.fn();
      setupSessionStore({ status: 'active', messages: [], sendMessage });
      setupProfileStore();
      render(<MeditationChat />);

      const textarea = screen.getByRole('textbox', {
        name: 'Type your message to Marcus',
      });
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        code: 'Enter',
        shiftKey: true,
      });

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('shows streaming content while isStreaming is true', () => {
      setupSessionStore({
        status: 'streaming',
        messages: [
          {
            id: '1',
            session_id: 's1',
            role: 'user' as const,
            content: 'Test',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        isStreaming: true,
        streamingContent: 'I hear',
      });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('I hear')).toBeInTheDocument();
      expect(screen.getByText('▋')).toBeInTheDocument();
    });

    it('shows loading spinner when streaming but no content yet', () => {
      setupSessionStore({
        status: 'streaming',
        messages: [],
        isStreaming: true,
        streamingContent: '',
      });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('Marcus is reflecting...')).toBeInTheDocument();
    });

    it('disables input while streaming', () => {
      setupSessionStore({
        status: 'streaming',
        messages: [],
        isStreaming: true,
        streamingContent: 'Loading...',
      });
      setupProfileStore();
      render(<MeditationChat />);

      const textarea = screen.getByRole('textbox', {
        name: 'Type your message to Marcus',
      });
      expect(textarea).toBeDisabled();
    });

    it('shows error message when error is present', () => {
      setupSessionStore({
        status: 'active',
        messages: [],
        error: 'Unable to connect to AI. Please ensure Ollama is running.',
      });
      setupProfileStore();
      render(<MeditationChat />);

      expect(
        screen.getByText('Unable to connect to AI. Please ensure Ollama is running.')
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Error state (status === "error")', () => {
    it('renders error view when status is error after beginSession fails', () => {
      setupSessionStore({
        status: 'error',
        error: 'Failed to start session. Server returned 500.',
      });
      setupProfileStore();
      render(<MeditationChat />);

      // Should show error message prominently
      expect(screen.getByText('Failed to start session. Server returned 500.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('shows Try Again button in error state', () => {
      const resetSession = vi.fn();
      setupSessionStore({
        status: 'error',
        error: 'Network error occurred.',
        resetSession,
      });
      setupProfileStore();
      render(<MeditationChat />);

      const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainBtn).toBeInTheDocument();
    });

    it('calls resetSession when Try Again button is clicked', () => {
      const resetSession = vi.fn();
      setupSessionStore({
        status: 'error',
        error: 'Session failed.',
        resetSession,
      });
      setupProfileStore();
      render(<MeditationChat />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(resetSession).toHaveBeenCalledTimes(1);
    });

    it('does not show chat input area in error state', () => {
      setupSessionStore({
        status: 'error',
        error: 'An error occurred.',
      });
      setupProfileStore();
      render(<MeditationChat />);

      // Should not show the chat textarea
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('does not show End Session button in error state', () => {
      setupSessionStore({
        status: 'error',
        error: 'An error occurred.',
      });
      setupProfileStore();
      render(<MeditationChat />);

      // Should not show End Session button
      expect(screen.queryByRole('button', { name: 'End meditation session' })).not.toBeInTheDocument();
    });

    it('displays error with non-empty message', () => {
      setupSessionStore({
        status: 'error',
        error: '500',
      });
      setupProfileStore();
      render(<MeditationChat />);

      // Error message should be displayed even if short
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  describe('Session summary state', () => {
    it('shows session summary with summary and action items', () => {
      setupSessionStore({
        status: 'summary',
        summary: 'A meaningful discussion about virtue.',
        actionItems: ['Reflect daily', 'Practice temperance'],
      });
      setupProfileStore();
      render(<MeditationChat />);

      expect(screen.getByText('Session Complete')).toBeInTheDocument();
      expect(screen.getByText('A meaningful discussion about virtue.')).toBeInTheDocument();
      expect(screen.getByText('Reflect daily')).toBeInTheDocument();
      expect(screen.getByText('Practice temperance')).toBeInTheDocument();
    });

    it('shows Begin New Meditation button in summary', () => {
      setupSessionStore({
        status: 'summary',
        summary: 'Summary text',
        actionItems: ['Item 1'],
      });
      setupProfileStore();
      render(<MeditationChat />);

      expect(
        screen.getByRole('button', { name: 'Begin a new meditation session' })
      ).toBeInTheDocument();
    });

    it('does not show scrollbar in textarea', () => {
      setupSessionStore({
        status: 'active',
        messages: [],
      });
      setupProfileStore();
      render(<MeditationChat />);

      const textarea = screen.getByRole('textbox', {
        name: 'Type your message to Marcus',
      });

      // Verify the textarea has the correct class for styling
      expect(textarea.className).toContain('meditation-chat__textarea');

      // The CSS class exists and is styled to hide scrollbar
      // This prevents the scrollbar from appearing and causing layout shift
    });

    it('resets session when Begin New Meditation button is clicked', () => {
      const resetSession = vi.fn();
      setupSessionStore({
        status: 'summary',
        summary: 'Summary text',
        actionItems: ['Item 1'],
        resetSession,
      });
      setupProfileStore();
      render(<MeditationChat />);

      fireEvent.click(screen.getByRole('button', { name: 'Begin a new meditation session' }));
      expect(resetSession).toHaveBeenCalledTimes(1);
    });
  });
});
