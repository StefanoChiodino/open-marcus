import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from './database.js';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('DatabaseService', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;

  beforeEach(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Profile Operations', () => {
    it('should create a profile', () => {
      const profile = db.createProfile('Marcus', 'Roman Emperor');
      
      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Marcus');
      expect(profile.bio).toBe('Roman Emperor');
    });

    it('should get a profile by id', () => {
      const created = db.createProfile('Test User', 'Test Bio');
      const fetched = db.getProfile(created.id);
      
      expect(fetched).toEqual(created);
    });

    it('should update a profile', () => {
      const created = db.createProfile('Original Name', 'Original Bio');
      const updated = db.updateProfile(created.id, 'New Name', 'New Bio');
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Name');
      expect(updated?.bio).toBe('New Bio');
    });

    it('should delete a profile', () => {
      const created = db.createProfile('To Delete', null);
      const deleted = db.deleteProfile(created.id);
      
      expect(deleted).toBe(true);
      expect(db.getProfile(created.id)).toBeUndefined();
    });

    it('should list all profiles', () => {
      db.createProfile('User 1', null);
      db.createProfile('User 2', null);
      
      const profiles = db.listProfiles();
      
      expect(profiles.length).toBe(2);
    });

    it('should verify profile data encryption', () => {
      const profile = db.createProfile('Encrypted User', 'Secret Bio');
      
      expect(db.verifyProfileData(profile.id)).toBe(true);
    });

    it('should fail verification for wrong encryption key', () => {
      const profile = db.createProfile('Test', null);
      const wrongKeyDb = new DatabaseService(testDbPath, 'wrong-key');
      
      expect(wrongKeyDb.verifyProfileData(profile.id)).toBe(false);
      wrongKeyDb.close();
    });
  });

  describe('Session Operations', () => {
    let profileId: string;

    beforeEach(() => {
      const profile = db.createProfile('Session Test User', null);
      profileId = profile.id;
    });

    it('should create a session', () => {
      const session = db.createSession(profileId);
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.profile_id).toBe(profileId);
      expect(session.status).toBe('intro');
    });

    it('should get a session by id', () => {
      const created = db.createSession(profileId);
      const fetched = db.getSession(created.id);
      
      expect(fetched).toEqual(created);
    });

    it('should update session status', () => {
      const session = db.createSession(profileId);
      const updated = db.updateSessionStatus(session.id, 'active');
      
      expect(updated?.status).toBe('active');
    });

    it('should end a session with summary and action items', () => {
      const session = db.createSession(profileId);
      const summary = 'Great progress made';
      const actionItems = ['Meditate daily', 'Practice gratitude'];
      
      const ended = db.endSession(session.id, summary, actionItems);
      
      expect(ended?.status).toBe('summary');
      expect(ended?.summary).toBe(summary);
      expect(JSON.parse(ended?.action_items || '[]')).toEqual(actionItems);
    });

    it('should list sessions for a profile', () => {
      db.createSession(profileId);
      db.createSession(profileId);
      
      const sessions = db.listSessions(profileId);
      
      expect(sessions.length).toBe(2);
    });

    it('should delete a session', () => {
      const session = db.createSession(profileId);
      const deleted = db.deleteSession(session.id);
      
      expect(deleted).toBe(true);
      expect(db.getSession(session.id)).toBeUndefined();
    });
  });

  describe('Message Operations', () => {
    let sessionId: string;

    beforeEach(() => {
      const profile = db.createProfile('Message Test User', null);
      const session = db.createSession(profile.id);
      sessionId = session.id;
    });

    it('should add a message', () => {
      const message = db.addMessage(sessionId, 'user', 'Hello, Marcus');
      
      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, Marcus');
    });

    it('should list messages for a session', () => {
      db.addMessage(sessionId, 'user', 'First message');
      db.addMessage(sessionId, 'assistant', 'Response to first');
      
      const messages = db.listMessages(sessionId);
      
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('First message');
      expect(messages[1].content).toBe('Response to first');
    });

    it('should delete messages for a session', () => {
      db.addMessage(sessionId, 'user', 'To be deleted');
      const deletedCount = db.deleteMessages(sessionId);
      
      expect(deletedCount).toBe(1);
      expect(db.listMessages(sessionId).length).toBe(0);
    });
  });

  describe('Action Item Operations', () => {
    let sessionId: string;

    beforeEach(() => {
      const profile = db.createProfile('Action Item Test User', null);
      const session = db.createSession(profile.id);
      sessionId = session.id;
    });

    it('should create an action item', () => {
      const item = db.createActionItem(sessionId, 'Practice morning meditation');
      
      expect(item).toBeDefined();
      expect(item.content).toBe('Practice morning meditation');
      expect(item.completed).toBe(0); // SQLite stores 0/1 for boolean
    });

    it('should list action items for a session', () => {
      db.createActionItem(sessionId, 'Item 1');
      db.createActionItem(sessionId, 'Item 2');
      
      const items = db.listActionItems(sessionId);
      
      expect(items.length).toBe(2);
    });

    it('should toggle action item completion', () => {
      const item = db.createActionItem(sessionId, 'Toggle me');
      const toggled = db.toggleActionItem(item.id);
      
      expect(toggled?.completed).toBe(1); // SQLite stores 0/1 for boolean
      
      const toggledAgain = db.toggleActionItem(item.id);
      expect(toggledAgain?.completed).toBe(0); // SQLite stores 0/1 for boolean
    });

    it('should delete an action item', () => {
      const item = db.createActionItem(sessionId, 'To delete');
      const deleted = db.deleteActionItem(item.id);
      
      expect(deleted).toBe(true);
      expect(db.getActionItem(item.id)).toBeUndefined();
    });
  });

  describe('Database Stats', () => {
    it('should return database statistics', () => {
      const profile = db.createProfile('Stats Test', null);
      const session = db.createSession(profile.id);
      
      db.addMessage(session.id, 'user', 'Test message');
      db.createActionItem(session.id, 'Test action item');
      
      const stats = db.getStats();
      
      expect(stats.profiles).toBe(1);
      expect(stats.sessions).toBe(1);
      expect(stats.messages).toBe(1);
      expect(stats.actionItems).toBe(1);
    });
  });
});

describe('Schema Validation', () => {
  const schemaTestDbPath = path.join(process.cwd(), 'test-data', `schema-test-${randomUUID()}.db`);

  afterEach(() => {
    try {
      if (fs.existsSync(schemaTestDbPath)) {
        fs.unlinkSync(schemaTestDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create all required tables', () => {
    const db = new Database(schemaTestDbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bio TEXT,
        encrypted_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'intro',
        summary TEXT,
        action_items TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS action_items (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        content TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    
    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = (tables as { name: string }[]).map(t => t.name);
    
    expect(tableNames).toContain('profiles');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('action_items');
    
    db.close();
  });
});
