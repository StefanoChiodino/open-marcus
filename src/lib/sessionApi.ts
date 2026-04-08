/**
 * API client for sessions and chat streaming
 */

import type {
  SessionDetail,
  SessionDTO,
  SessionSummaryResponse,
  StreamToken,
} from '../shared/types';
import { getAuthHeader } from './auth';

const BASE_URL = '/api';

function authHeaders(): HeadersInit {
  const header = getAuthHeader();
  return header ? { Authorization: header } : {};
}

export class SessionAPIClient {
  /**
   * Create a new meditation session for the authenticated user
   */
  async createSession(): Promise<SessionDTO> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to create session: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get session details with messages
   */
  async getSession(sessionId: string): Promise<SessionDetail> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to get session: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionDTO[]> {
    const response = await fetch(`${BASE_URL}/sessions`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to list sessions: ${response.status}`);
    }

    return response.json();
  }

  /**
   * End a session with summary
   */
  async endSession(
    sessionId: string,
    summary: string,
    actionItems?: string[]
  ): Promise<SessionDTO> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ summary, action_items: actionItems || [] }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to end session: ${response.status}`);
    }

    return response.json();
  }

  /**
   * End session with AI-generated summary
   */
  async endAndSummarize(sessionId: string): Promise<SessionSummaryResponse> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/end-and-summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to end and summarize session: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionDTO['status']): Promise<SessionDTO> {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to update session status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send a message and stream the AI response
   * Returns an async generator yielding stream tokens
   */
  async *streamChat(
    sessionId: string,
    message: string
  ): AsyncGenerator<StreamToken, void, unknown> {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        ...authHeaders(),
      },
      body: JSON.stringify({ session_id: sessionId, message: message.trim() }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Chat failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const token: StreamToken = JSON.parse(buffer.trim());
              yield token;
            } catch {
              // Ignore incomplete trailing JSON
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete NDJSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const token: StreamToken = JSON.parse(line);
            yield token;
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const sessionAPI = new SessionAPIClient();
