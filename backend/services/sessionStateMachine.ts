/**
 * Session State Machine
 * Manages the conversation flow for a meditation session.
 *
 * State transitions:
 *   CREATED → ACTIVE → CLOSING → COMPLETED
 *                ↓
 *            [PAUSED]
 *
 * - intro (CREATED): Session just created, waiting for first message
 * - active: Conversation in progress
 * - closing: User initiated session wrapping
 * - summary (COMPLETED): Summary generated, session archived
 */

import type { SessionService } from './session.js';
import type { Session } from '../db/schema.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export type SessionPhase = 'intro' | 'active' | 'closing' | 'summary';

/**
 * State transition map — which statuses are valid next steps from each status.
 */
const VALID_TRANSITIONS: Record<SessionPhase, SessionPhase[]> = {
  intro: ['active', 'closing', 'summary'],
  active: ['closing', 'summary', 'active'],  // active → active is valid (no-op)
  closing: ['summary', 'active'],            // can return to active from closing
  summary: [],                               // terminal state
};

export class SessionStateMachine {
  private sessionService: SessionService;

  constructor(sessionService?: SessionService) {
    this.sessionService = sessionService || (() => {
      const { getSessionService } = require('./session.js');
      return getSessionService();
    })();
  }

  /**
   * Get the current phase of a session
   */
  getCurrentPhase(sessionId: string): SessionPhase {
    const session = this.sessionService.getSessionWithoutMessages(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session.status as SessionPhase;
  }

  /**
   * Transition a session to a new phase
   */
  transition(sessionId: string, targetPhase: SessionPhase): Session {
    const currentPhase = this.getCurrentPhase(sessionId);
    const allowed = VALID_TRANSITIONS[currentPhase];

    if (!allowed.includes(targetPhase)) {
      throw new StateTransitionError(
        `Cannot transition from '${currentPhase}' to '${targetPhase}'. Allowed: ${allowed.join(', ')}`,
      );
    }

    const session = this.sessionService.updateSessionStatus(sessionId, targetPhase);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  /**
   * Start the conversation (intro → active)
   */
  startConversation(sessionId: string): Session {
    return this.transition(sessionId, 'active');
  }

  /**
   * Begin closing the session (active → closing)
   */
  beginClosing(sessionId: string): Session {
    return this.transition(sessionId, 'closing');
  }

  /**
   * Cancel closing and return to active (closing → active)
   */
  cancelClosing(sessionId: string): Session {
    return this.transition(sessionId, 'active');
  }

  /**
   * Complete the session with summary (any valid path → summary)
   */
  completeSession(sessionId: string): Session {
    return this.transition(sessionId, 'summary');
  }

  /**
   * Check if a session is in a terminal (completed) state
   */
  isCompleted(sessionId: string): boolean {
    const phase = this.getCurrentPhase(sessionId);
    return phase === 'summary';
  }

  /**
   * Check if a session can accept more messages
   */
  canAcceptMessages(sessionId: string): boolean {
    const phase = this.getCurrentPhase(sessionId);
    return phase === 'intro' || phase === 'active' || phase === 'closing';
  }

  /**
   * Get a user-friendly description of the current session state
   */
  getStateDescription(sessionId: string): string {
    const phase = this.getCurrentPhase(sessionId);
    switch (phase) {
      case 'intro':
        return 'Session is initializing. Marcus is ready for your first message.';
      case 'active':
        return 'Conversation is active.';
      case 'closing':
        return 'Session is winding down. You can continue or finalize.';
      case 'summary':
        return 'Session is complete. Summary and action items are available.';
      default:
        return 'Unknown state';
    }
  }
}

/**
 * Custom error for invalid state transitions
 */
export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

// Singleton instance
let stateMachineInstance: SessionStateMachine | null = null;

export function getSessionStateMachine(sessionService?: SessionService): SessionStateMachine {
  if (!stateMachineInstance) {
    stateMachineInstance = new SessionStateMachine(sessionService);
  }
  return stateMachineInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSessionStateMachine(): void {
  stateMachineInstance = null;
}
