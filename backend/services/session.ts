import type { DatabaseService } from '../db/database.js';
import type { Session, Message } from '../db/schema.js';
import { createRequire } from 'module';
import { logSessionCreated, logAuthError } from '../lib/authLogger.js';
import { getCorrelationId } from '../lib/logger.js';
const require = createRequire(import.meta.url);

/**
 * Session service - handles session and message business logic
 */
export class SessionService {
  private db: DatabaseService | null = null;
  private dbGetter: () => DatabaseService;

  constructor(dbGetter?: () => DatabaseService) {
    this.dbGetter = dbGetter || (() => {
      // ESM-compatible require via createRequire
      const { getDatabase } = require('../db/database.js');
      return getDatabase();
    });
  }

  private getDb(): DatabaseService {
    if (!this.db) {
      this.db = this.dbGetter();
    }
    return this.db;
  }

  /**
   * Create a new session for a profile
   */
  createSession(profileId: string): Session {
    if (!profileId || profileId.trim().length === 0) {
      throw new ValidationError('Profile ID is required');
    }

    // Verify the profile exists
    const profile = this.getDb().getProfile(profileId);
    if (!profile) {
      throw new ValidationError('Profile not found');
    }

    try {
      const session = this.getDb().createSession(profileId);
      
      // Log session creation for auth auditing
      logSessionCreated(session.id, profileId, getCorrelationId());
      
      return session;
    } catch (error) {
      // Log auth errors
      if (error instanceof Error) {
        logAuthError(error, getCorrelationId());
      }
      throw error;
    }
  }

  /**
   * Get a session by ID with its messages
   */
  getSession(id: string): { session: Session; messages: Message[] } | null {
    const session = this.getDb().getSession(id);
    if (!session) {
      return null;
    }

    const messages = this.getDb().listMessages(id);
    return { session, messages };
  }

  /**
   * Get a session by ID without messages
   */
  getSessionWithoutMessages(id: string): Session | null {
    return this.getDb().getSession(id);
  }

  /**
   * List all sessions for a profile
   */
  listSessions(profileId: string): Session[] {
    return this.getDb().listSessions(profileId);
  }

  /**
   * List all sessions across all profiles
   */
  listAllSessions(): Session[] {
    return this.getDb().listAllSessions();
  }

  /**
   * List all sessions for a specific user (multi-user isolation)
   */
  listSessionsByUserId(userId: string): Session[] {
    return this.getDb().listSessionsByUserId(userId);
  }

  /**
   * End a session with summary and action items
   */
  endSession(id: string, summary: string, actionItems: string[]): Session | null {
    if (!summary || summary.trim().length === 0) {
      throw new ValidationError('Session summary is required');
    }

    const session = this.getDb().getSession(id);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    return this.getDb().endSession(id, summary, actionItems);
  }

  /**
   * Update session status
   */
  updateSessionStatus(id: string, status: Session['status']): Session | null {
    const session = this.getDb().getSession(id);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    return this.getDb().updateSessionStatus(id, status);
  }

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Message {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new ValidationError('Session ID is required');
    }

    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }

    if (role !== 'user' && role !== 'assistant') {
      throw new ValidationError('Message role must be "user" or "assistant"');
    }

    // Verify the session exists
    const session = this.getDb().getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    return this.getDb().addMessage(sessionId, role, content);
  }

  /**
   * Get a message by ID
   */
  getMessage(id: string): Message | null {
    return this.getDb().getMessage(id);
  }

  /**
   * List all messages for a session
   */
  listMessages(sessionId: string): Message[] {
    const session = this.getDb().getSession(sessionId);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    return this.getDb().listMessages(sessionId);
  }

  /**
   * Delete a session and all associated data
   */
  deleteSession(id: string): boolean {
    return this.getDb().deleteSession(id);
  }
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Singleton instance
let sessionServiceInstance: SessionService | null = null;

export function getSessionService(dbGetter?: () => DatabaseService): SessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new SessionService(dbGetter);
  }
  return sessionServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSessionService(): void {
  sessionServiceInstance = null;
}
