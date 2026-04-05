import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SessionStateMachine,
  StateTransitionError,
  resetSessionStateMachine,
} from './sessionStateMachine.js';
import { SessionService, resetSessionService } from './session.js';
import { DatabaseService } from '../db/database.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('Session State Machine', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `state-machine-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let sessionService: SessionService;
  let stateMachine: SessionStateMachine;
  let profileId: string;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetSessionService();
    resetSessionStateMachine();
    sessionService = new SessionService(() => db);
    stateMachine = new SessionStateMachine(sessionService);

    const profile = db.createProfile('Test User', 'Test Bio');
    profileId = profile.id;
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignore
    }
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore
    }
  });

  describe('getCurrentPhase', () => {
    it('should return intro for a new session', () => {
      const session = sessionService.createSession(profileId);
      const phase = stateMachine.getCurrentPhase(session.id);
      expect(phase).toBe('intro');
    });

    it('should throw error for non-existent session', () => {
      expect(() => stateMachine.getCurrentPhase(randomUUID())).toThrow('Session not found');
    });
  });

  describe('transition', () => {
    it('should transition from intro to active', () => {
      const session = sessionService.createSession(profileId);
      const updated = stateMachine.transition(session.id, 'active');
      expect(updated.status).toBe('active');
    });

    it('should transition from intro to closing', () => {
      const session = sessionService.createSession(profileId);
      const updated = stateMachine.transition(session.id, 'closing');
      expect(updated.status).toBe('closing');
    });

    it('should transition from active to closing', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      const updated = stateMachine.transition(session.id, 'closing');
      expect(updated.status).toBe('closing');
    });

    it('should transition from active to summary', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      const updated = stateMachine.transition(session.id, 'summary');
      expect(updated.status).toBe('summary');
    });

    it('should allow returning from closing to active', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      stateMachine.beginClosing(session.id);
      const updated = stateMachine.cancelClosing(session.id);
      expect(updated.status).toBe('active');
    });

    it('should reject invalid transition from summary', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.completeSession(session.id);

      expect(() => stateMachine.transition(session.id, 'active')).toThrow(StateTransitionError);
    });

    it('should reject transition from active directly to intro', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);

      expect(() => stateMachine.transition(session.id, 'intro')).toThrow(StateTransitionError);
    });

    it('should reject invalid status transition', () => {
      const session = sessionService.createSession(profileId);

      // Try to transition to a status that doesn't exist as a target
      // Since we type-check, this would be a runtime check issue
      // But let's test an actual invalid path
      stateMachine.startConversation(session.id);
      expect(() => stateMachine.transition(session.id, 'intro')).toThrow(StateTransitionError);
    });
  });

  describe('convenience methods', () => {
    it('startConversation should transition intro -> active', () => {
      const session = sessionService.createSession(profileId);
      const updated = stateMachine.startConversation(session.id);
      expect(updated.status).toBe('active');
    });

    it('beginClosing should transition active -> closing', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      const updated = stateMachine.beginClosing(session.id);
      expect(updated.status).toBe('closing');
    });

    it('cancelClosing should transition closing -> active', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      stateMachine.beginClosing(session.id);
      const updated = stateMachine.cancelClosing(session.id);
      expect(updated.status).toBe('active');
    });

    it('completeSession should transition to summary', () => {
      const session = sessionService.createSession(profileId);
      const updated = stateMachine.completeSession(session.id);
      expect(updated.status).toBe('summary');
    });

    it('completeSession from closing should also work', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      stateMachine.beginClosing(session.id);
      const updated = stateMachine.completeSession(session.id);
      expect(updated.status).toBe('summary');
    });
  });

  describe('isCompleted', () => {
    it('should return false for intro session', () => {
      const session = sessionService.createSession(profileId);
      expect(stateMachine.isCompleted(session.id)).toBe(false);
    });

    it('should return false for active session', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      expect(stateMachine.isCompleted(session.id)).toBe(false);
    });

    it('should return true for summary session', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.completeSession(session.id);
      expect(stateMachine.isCompleted(session.id)).toBe(true);
    });
  });

  describe('canAcceptMessages', () => {
    it('should return true for intro session', () => {
      const session = sessionService.createSession(profileId);
      expect(stateMachine.canAcceptMessages(session.id)).toBe(true);
    });

    it('should return true for active session', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      expect(stateMachine.canAcceptMessages(session.id)).toBe(true);
    });

    it('should return true for closing session', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      stateMachine.beginClosing(session.id);
      expect(stateMachine.canAcceptMessages(session.id)).toBe(true);
    });

    it('should return false for completed session', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.completeSession(session.id);
      expect(stateMachine.canAcceptMessages(session.id)).toBe(false);
    });
  });

  describe('getStateDescription', () => {
    it('should return description for intro', () => {
      const session = sessionService.createSession(profileId);
      const desc = stateMachine.getStateDescription(session.id);
      expect(desc).toContain('initializing');
    });

    it('should return description for active', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      const desc = stateMachine.getStateDescription(session.id);
      expect(desc).toContain('active');
    });

    it('should return description for closing', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.startConversation(session.id);
      stateMachine.beginClosing(session.id);
      const desc = stateMachine.getStateDescription(session.id);
      expect(desc).toContain('winding down');
    });

    it('should return description for summary', () => {
      const session = sessionService.createSession(profileId);
      stateMachine.completeSession(session.id);
      const desc = stateMachine.getStateDescription(session.id);
      expect(desc).toContain('complete');
    });
  });
});
