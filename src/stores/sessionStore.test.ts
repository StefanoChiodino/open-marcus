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
  });
});
