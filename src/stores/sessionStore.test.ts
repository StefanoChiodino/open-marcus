import { useSessionStore } from './sessionStore';
import { sessionAPI } from '../lib/sessionApi';

// Mock dependencies
vi.mock('../lib/sessionApi', () => ({
  sessionAPI: {
    createSession: vi.fn(),
    getSession: vi.fn(),
    endAndSummarize: vi.fn(),
    streamChat: vi.fn(),
  },
}));

vi.mock('./toastStore', () => ({
  useToastStore: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  },
}));

describe('SessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('openmarcus-active-session-id');
    useSessionStore.getState().resetSession();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      const state = useSessionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe('beginSession', () => {
    it('creates a session successfully', async () => {
      const mockSession = { id: 'session-1', profile_id: 'p1', status: 'intro' as const };
      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await useSessionStore.getState().beginSession('p1');

      const state = useSessionStore.getState();
      expect(state.currentSession).toEqual(mockSession);
      expect(state.status).toBe('active');
      expect(state.error).toBeNull();
    });

    it('sets error state on failure', async () => {
      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      await useSessionStore.getState().beginSession('p1');

      const state = useSessionStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Network error');
    });

    it('persists session ID to localStorage on success', async () => {
      const mockSession = { id: 'persist-session-123', profile_id: 'p1', status: 'intro' as const };
      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      await useSessionStore.getState().beginSession('p1');

      expect(localStorage.getItem('openmarcus-active-session-id')).toBe('persist-session-123');
    });

    it('does not persist session ID to localStorage on failure', async () => {
      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      await useSessionStore.getState().beginSession('p1');

      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });
  });

  describe('endSession', () => {
    it('ends session and shows summary', async () => {
      const mockSession = { id: 's1', profile_id: 'p1', status: 'active' as const };
      const mockSummary = {
        session: mockSession,
        summary: 'A reflective conversation',
        actionItems: ['Item 1'],
      };

      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (sessionAPI.endAndSummarize as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummary);
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockSession,
        messages: [],
      });

      // Start session first
      await useSessionStore.getState().beginSession('p1');

      // End session
      await useSessionStore.getState().endSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('summary');
      expect(state.summary).toBe('A reflective conversation');
      expect(state.actionItems).toEqual(['Item 1']);
    });

    it('sets error state on end failure', async () => {
      const mockSession = { id: 's1', profile_id: 'p1', status: 'active' as const };

      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (sessionAPI.endAndSummarize as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Summary failed'),
      );

      await useSessionStore.getState().beginSession('p1');
      await useSessionStore.getState().endSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Summary failed');
    });

    it('clears persisted session ID on successful end', async () => {
      const mockSession = { id: 's-end-persist', profile_id: 'p1', status: 'active' as const };
      const mockSummary = {
        session: mockSession,
        summary: 'Summary text',
        actionItems: [],
      };

      (sessionAPI.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (sessionAPI.endAndSummarize as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummary);
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockSession,
        messages: [],
      });

      // Start and persist
      await useSessionStore.getState().beginSession('p1');
      expect(localStorage.getItem('openmarcus-active-session-id')).toBe('s-end-persist');

      // End should clear the persisted ID
      await useSessionStore.getState().endSession();
      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });
  });

  describe('resetSession', () => {
    it('resets all state to initial values', () => {
      const store = useSessionStore.getState();
      // Set some state
      store.beginSession = vi.fn(); // prevent async
      // Manually reset
      store.resetSession();

      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.streamingContent).toBe('');
      expect(state.isStreaming).toBe(false);
      expect(state.summary).toBeNull();
      expect(state.actionItems).toEqual([]);
    });

    it('clears persisted session ID', () => {
      localStorage.setItem('openmarcus-active-session-id', 'some-session-id');

      useSessionStore.getState().resetSession();

      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });
  });

  describe('restoreSession', () => {
    it('does nothing when no persisted session ID exists', async () => {
      await useSessionStore.getState().restoreSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
    });

    it('restores active session from persisted ID', async () => {
      // Simulate a previously active session
      const mockSession = { id: 'restore-me', profile_id: 'p1', status: 'active' as const };
      const mockMessages = [
        { id: 'm1', session_id: 'restore-me', role: 'user' as const, content: 'Hello', created_at: '2024-01-01' },
        { id: 'm2', session_id: 'restore-me', role: 'assistant' as const, content: 'Hi back', created_at: '2024-01-01' },
      ];

      localStorage.setItem('openmarcus-active-session-id', 'restore-me');
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockSession,
        messages: mockMessages,
      });

      await useSessionStore.getState().restoreSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('active');
      expect(state.currentSession).toEqual(mockSession);
      expect(state.messages).toEqual(mockMessages);
    });

    it('resets to idle if persisted session is already completed (summary)', async () => {
      const mockCompletedSession = { id: 'completed-id', profile_id: 'p1', status: 'summary' as const };
      localStorage.setItem('openmarcus-active-session-id', 'completed-id');
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockCompletedSession,
        messages: [],
      });

      await useSessionStore.getState().restoreSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentSession).toBeNull();
      expect(state.messages).toEqual([]);
      // Should clear the persisted ID for a completed session
      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });

    it('resets to idle and clears persisted ID when API call fails', async () => {
      localStorage.setItem('openmarcus-active-session-id', 'nonexistent-id');
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not found'),
      );

      await useSessionStore.getState().restoreSession();

      const state = useSessionStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentSession).toBeNull();
      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });

    it('clears persisted ID when loadSession loads a completed session', async () => {
      const mockCompletedSession = { id: 'completed-load', profile_id: 'p1', status: 'summary' as const };
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockCompletedSession,
        messages: [],
      });

      await useSessionStore.getState().loadSession('completed-load');

      expect(localStorage.getItem('openmarcus-active-session-id')).toBeNull();
    });

    it('persists session ID when loadSession loads an active session', async () => {
      const mockActiveSession = { id: 'active-load', profile_id: 'p1', status: 'active' as const };
      (sessionAPI.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        session: mockActiveSession,
        messages: [],
      });

      await useSessionStore.getState().loadSession('active-load');

      expect(localStorage.getItem('openmarcus-active-session-id')).toBe('active-load');
    });
  });
});
