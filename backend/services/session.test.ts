import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService, resetSessionService, ValidationError } from './session.js';
import { DatabaseService } from '../db/database.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('SessionService', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `session-service-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let sessionService: SessionService;
  let profileId: string;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetSessionService();
    sessionService = new SessionService(() => db);

    // Create a profile for testing
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

  describe('createSession', () => {
    it('should create a session for a valid profile', () => {
      const session = sessionService.createSession(profileId);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.profile_id).toBe(profileId);
      expect(session.status).toBe('intro');
      expect(session.started_at).toBeDefined();
    });

    it('should throw error for non-existent profile', () => {
      const nonExistentProfileId = randomUUID();

      expect(() => sessionService.createSession(nonExistentProfileId)).toThrow(ValidationError);
      expect(() => sessionService.createSession(nonExistentProfileId)).toThrow('Profile not found');
    });

    it('should throw error for empty profile ID', () => {
      expect(() => sessionService.createSession('')).toThrow(ValidationError);
      expect(() => sessionService.createSession('')).toThrow('Profile ID is required');
    });
  });

  describe('getSession', () => {
    it('should return session with messages', () => {
      const session = sessionService.createSession(profileId);
      db.addMessage(session.id, 'user', 'Hello');
      db.addMessage(session.id, 'assistant', 'Hi there');

      const result = sessionService.getSession(session.id);

      expect(result).not.toBeNull();
      expect(result!.session.id).toBe(session.id);
      expect(result!.messages.length).toBe(2);
      expect(result!.messages[0].role).toBe('user');
      expect(result!.messages[1].role).toBe('assistant');
    });

    it('should return null for non-existent session', () => {
      const result = sessionService.getSession(randomUUID());

      expect(result).toBeNull();
    });

    it('should return session with empty messages array when no messages', () => {
      const session = sessionService.createSession(profileId);

      const result = sessionService.getSession(session.id);

      expect(result).not.toBeNull();
      expect(result!.messages.length).toBe(0);
    });
  });

  describe('getSessionWithoutMessages', () => {
    it('should return session without messages', () => {
      const session = sessionService.createSession(profileId);

      const result = sessionService.getSessionWithoutMessages(session.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(session.id);
    });

    it('should return undefined for non-existent session', () => {
      const result = sessionService.getSessionWithoutMessages(randomUUID());

      expect(result).toBeUndefined();
    });
  });

  describe('listSessions', () => {
    it('should list sessions for a profile', () => {
      sessionService.createSession(profileId);
      sessionService.createSession(profileId);

      const sessions = sessionService.listSessions(profileId);

      expect(sessions.length).toBe(2);
    });

    it('should return empty array for profile with no sessions', () => {
      const sessions = sessionService.listSessions(profileId);

      expect(sessions.length).toBe(0);
    });
  });

  describe('listAllSessions', () => {
    it('should list all sessions across profiles', () => {
      const profile2 = db.createProfile('Another User', null);
      sessionService.createSession(profileId);
      sessionService.createSession(profile2.id);

      const sessions = sessionService.listAllSessions();

      expect(sessions.length).toBe(2);
    });
  });

  describe('endSession', () => {
    it('should end a session with summary and action items', () => {
      const session = sessionService.createSession(profileId);
      const summary = 'Great progress today';
      const actionItems = ['Meditate daily', 'Practice gratitude'];

      const ended = sessionService.endSession(session.id, summary, actionItems);

      expect(ended).not.toBeNull();
      expect(ended!.status).toBe('summary');
      expect(ended!.summary).toBe(summary);
      expect(JSON.parse(ended!.action_items || '[]')).toEqual(actionItems);
      expect(ended!.ended_at).toBeDefined();
    });

    it('should throw error for non-existent session', () => {
      expect(() =>
        sessionService.endSession(randomUUID(), 'Summary', ['Item'])
      ).toThrow(ValidationError);
      expect(() =>
        sessionService.endSession(randomUUID(), 'Summary', ['Item'])
      ).toThrow('Session not found');
    });

    it('should throw error for empty summary', () => {
      const session = sessionService.createSession(profileId);

      expect(() => sessionService.endSession(session.id, '', [])).toThrow(ValidationError);
      expect(() => sessionService.endSession(session.id, '', [])).toThrow('Session summary is required');
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', () => {
      const session = sessionService.createSession(profileId);

      const updated = sessionService.updateSessionStatus(session.id, 'active');

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('active');
    });

    it('should throw error for non-existent session', () => {
      expect(() =>
        sessionService.updateSessionStatus(randomUUID(), 'active')
      ).toThrow(ValidationError);
      expect(() =>
        sessionService.updateSessionStatus(randomUUID(), 'active')
      ).toThrow('Session not found');
    });
  });

  describe('addMessage', () => {
    it('should add a user message to a session', () => {
      const session = sessionService.createSession(profileId);

      const message = sessionService.addMessage(session.id, 'user', 'Hello, Marcus');

      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, Marcus');
      expect(message.session_id).toBe(session.id);
    });

    it('should add an assistant message to a session', () => {
      const session = sessionService.createSession(profileId);

      const message = sessionService.addMessage(session.id, 'assistant', 'Welcome to your meditation');

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Welcome to your meditation');
    });

    it('should throw error for non-existent session', () => {
      expect(() =>
        sessionService.addMessage(randomUUID(), 'user', 'Hello')
      ).toThrow(ValidationError);
      expect(() =>
        sessionService.addMessage(randomUUID(), 'user', 'Hello')
      ).toThrow('Session not found');
    });

    it('should throw error for empty content', () => {
      const session = sessionService.createSession(profileId);

      expect(() => sessionService.addMessage(session.id, 'user', '')).toThrow(ValidationError);
      expect(() => sessionService.addMessage(session.id, 'user', '')).toThrow('Message content is required');
    });

    it('should throw error for invalid role', () => {
      const session = sessionService.createSession(profileId);

      expect(() => sessionService.addMessage(session.id, 'invalid' as any, 'Hello')).toThrow(ValidationError);
    });
  });

  describe('getMessage', () => {
    it('should get a message by ID', () => {
      const session = sessionService.createSession(profileId);
      const message = db.addMessage(session.id, 'user', 'Test message');

      const found = sessionService.getMessage(message.id);

      expect(found).toBeDefined();
      expect(found!.content).toBe('Test message');
    });

    it('should return undefined for non-existent message', () => {
      const found = sessionService.getMessage(randomUUID());

      expect(found).toBeUndefined();
    });
  });

  describe('listMessages', () => {
    it('should list messages for a session', () => {
      const session = sessionService.createSession(profileId);
      db.addMessage(session.id, 'user', 'First');
      db.addMessage(session.id, 'assistant', 'Second');

      const messages = sessionService.listMessages(session.id);

      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });

    it('should throw error for non-existent session', () => {
      expect(() => sessionService.listMessages(randomUUID())).toThrow(ValidationError);
      expect(() => sessionService.listMessages(randomUUID())).toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', () => {
      const session = sessionService.createSession(profileId);

      const deleted = sessionService.deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(sessionService.getSessionWithoutMessages(session.id)).toBeUndefined();
    });
  });
});
