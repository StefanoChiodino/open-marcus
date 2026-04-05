/**
 * Session store using Zustand
 * Manages meditation session state, messages, and streaming
 */

import { create } from 'zustand';
import { sessionAPI } from '../lib/sessionApi';
import { useToastStore } from './toastStore';
import type {
  SessionDTO,
  MessageDTO,
  SessionSummaryResponse,
} from '../shared/types';

export type SessionStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'streaming'
  | 'ending'
  | 'summary'
  | 'error';

interface SessionState {
  // Session data
  currentSession: SessionDTO | null;
  messages: MessageDTO[];
  status: SessionStatus;
  error: string | null;

  // Streaming state
  streamingContent: string;
  isStreaming: boolean;

  // Summary state
  summary: string | null;
  actionItems: string[];

  // Actions
  beginSession: (profileId?: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  endSession: () => Promise<void>;

  // State management
  resetSession: () => void;
  loadSession: (sessionId: string) => Promise<void>;

  // Helper to update profileId when starting from profile store
  setProfileId: (profileId: string) => void;
}

let pendingProfileId: string | undefined;

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  messages: [],
  status: 'idle',
  error: null,
  streamingContent: '',
  isStreaming: false,
  summary: null,
  actionItems: [],

  setProfileId: (profileId: string) => {
    pendingProfileId = profileId;
  },

  /**
   * Begin a new meditation session
   */
  beginSession: async (profileId?: string) => {
    set({
      status: 'starting',
      currentSession: null,
      messages: [],
      error: null,
      summary: null,
      actionItems: [],
      streamingContent: '',
      isStreaming: false,
    });

    try {
      const sid = profileId || pendingProfileId;
      const session = await sessionAPI.createSession(sid);

      set({
        currentSession: session,
        status: 'active',
        messages: [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      set({ status: 'error', error: message });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Session Error',
        message,
      });
    }
  },

  /**
   * Send a message and stream the AI response
   */
  sendMessage: async (message: string) => {
    const { currentSession, status } = get();

    if (!currentSession || status === 'ending' || status === 'streaming') {
      return;
    }

    // Add user message immediately
    const userMessage: MessageDTO = {
      id: `pending-user-${Date.now()}`,
      session_id: currentSession.id,
      role: 'user',
      content: message.trim(),
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      streamingContent: '',
      isStreaming: true,
      status: 'streaming',
      error: null,
    }));

    try {
      // Clear the pending user message placeholder and start streaming
      let assistantContent = '';
      let done = false;

      for await (const token of sessionAPI.streamChat(
        currentSession.id,
        message,
      )) {
        if (token.error) {
          throw new Error(token.error);
        }

        if (token.done) {
          done = true;
          assistantContent = token.full_response || token.token || assistantContent;
        } else if (token.token !== undefined) {
          assistantContent += token.token;
          set({ streamingContent: assistantContent });
        }
      }

      // If streaming ended without a done token, use what we have
      if (!done && assistantContent.length === 0) {
        assistantContent = get().streamingContent || '';
      }

      const assistantMessage: MessageDTO = {
        id: `pending-assistant-${Date.now()}`,
        session_id: currentSession.id,
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        streamingContent: '',
        isStreaming: false,
        status: 'active',
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      set({
        status: 'active',
        isStreaming: false,
        streamingContent: '',
        error: message,
      });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Chat Error',
        message,
      });
    }
  },

  /**
   * End the session and generate summary
   */
  endSession: async () => {
    const { currentSession } = get();

    if (!currentSession) {
      return;
    }

    set({ status: 'ending', error: null });

    try {
      const result: SessionSummaryResponse = await sessionAPI.endAndSummarize(
        currentSession.id,
      );

      // Reload session to get any pending messages saved by the backend
      try {
        const sessionDetail = await sessionAPI.getSession(currentSession.id);
        set({
          currentSession: sessionDetail.session,
          messages: sessionDetail.messages,
        });
      } catch {
        // If reload fails, keep current messages
      }

      set({
        status: 'summary',
        summary: result.summary,
        actionItems: result.actionItems || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      set({
        status: 'error',
        error: message,
      });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Error',
        message,
      });
    }
  },

  /**
   * Reset session state to idle
   */
  resetSession: () => {
    set({
      currentSession: null,
      messages: [],
      status: 'idle',
      error: null,
      streamingContent: '',
      isStreaming: false,
      summary: null,
      actionItems: [],
    });
  },

  /**
   * Load an existing session by ID
   */
  loadSession: async (sessionId: string) => {
    set({ status: 'starting', error: null });

    try {
      const detail = await sessionAPI.getSession(sessionId);
      set({
        currentSession: detail.session,
        messages: detail.messages,
        status: detail.session.status === 'summary' ? 'summary' : 'active',
        summary: detail.session.summary,
        actionItems: detail.session.action_items || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      set({ status: 'error', error: message });
      useToastStore.getState().addToast({
        type: 'error',
        title: 'Load Error',
        message,
      });
    }
  },
}));
