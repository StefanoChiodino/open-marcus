import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { MigrationRunner } from './migrate.js';
import { encryptObject, decryptObject, EncryptedData } from '../crypto/encryption.js';
import type { Profile, Session, Message, ActionItem } from './schema.js';

const DB_PATH = './data/openmarcus.db';

export class DatabaseService {
  private db: Database.Database;
  private encryptionPassword: string;
  private migrationRunner: MigrationRunner;

  constructor(dbPath: string = DB_PATH, encryptionPassword?: string) {
    // Ensure data directory exists (synchronously)
    const dirPath = dbPath.replace(/[^/]+$/, '');
    if (dirPath && !fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Use environment variable or generate a default for development
    this.encryptionPassword = encryptionPassword || process.env.ENCRYPTION_KEY || 'development-key-change-in-production';
    
    this.migrationRunner = new MigrationRunner(this.db);
    
    // Run migrations on startup
    this.migrationRunner.run();
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  // ==================== Profile Operations ====================

  /**
   * Create a new profile with encrypted data
   */
  createProfile(name: string, bio: string | null = null, data: object = {}): Profile {
    const id = randomUUID();
    const encryptedData = encryptObject({ ...data, name, bio }, this.encryptionPassword);
    
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, bio, encrypted_data)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, name, bio, JSON.stringify(encryptedData));
    
    return this.getProfile(id)!;
  }

  /**
   * Get a profile by ID
   */
  getProfile(id: string): Profile | null {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
    return stmt.get(id) as Profile | null;
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, name: string, bio: string | null = null, data: object = {}): Profile | null {
    const encryptedData = encryptObject({ ...data, name, bio }, this.encryptionPassword);
    
    const stmt = this.db.prepare(`
      UPDATE profiles
      SET name = ?, bio = ?, encrypted_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(name, bio, JSON.stringify(encryptedData), id);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getProfile(id);
  }

  /**
   * Delete a profile and all associated data (cascade)
   */
  deleteProfile(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * List all profiles
   */
  listProfiles(): Profile[] {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC');
    return stmt.all() as Profile[];
  }

  /**
   * Verify profile data can be decrypted (for validation)
   */
  verifyProfileData(id: string): boolean {
    const profile = this.getProfile(id);
    if (!profile) return false;
    
    try {
      const encrypted: EncryptedData = JSON.parse(profile.encrypted_data);
      decryptObject<{ name: string; bio: string | null }>(encrypted, this.encryptionPassword);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Session Operations ====================

  /**
   * Create a new session
   */
  createSession(profileId: string): Session {
    const id = randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, profile_id, status, started_at)
      VALUES (?, ?, 'intro', datetime('now'))
    `);
    
    stmt.run(id, profileId);
    
    return this.getSession(id)!;
  }

  /**
   * Get a session by ID
   */
  getSession(id: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as Session | null;
  }

  /**
   * Update session status
   */
  updateSessionStatus(id: string, status: Session['status']): Session | null {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(status, id);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getSession(id);
  }

  /**
   * End a session
   */
  endSession(id: string, summary: string, actionItems: string[]): Session | null {
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET status = 'summary', summary = ?, action_items = ?,
          ended_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(summary, JSON.stringify(actionItems), id);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getSession(id);
  }

  /**
   * List sessions for a profile
   */
  listSessions(profileId: string): Session[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE profile_id = ?
      ORDER BY started_at DESC
    `);
    return stmt.all(profileId) as Session[];
  }

  /**
   * List all sessions
   */
  listAllSessions(): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY started_at DESC');
    return stmt.all() as Session[];
  }

  /**
   * Delete a session and all associated messages
   */
  deleteSession(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Message Operations ====================

  /**
   * Add a message to a session
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Message {
    const id = randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, sessionId, role, content);
    
    return this.getMessage(id)!;
  }

  /**
   * Get a message by ID
   */
  getMessage(id: string): Message | null {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    return stmt.get(id) as Message | null;
  }

  /**
   * List messages for a session
   */
  listMessages(sessionId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as Message[];
  }

  /**
   * Delete all messages for a session
   */
  deleteMessages(sessionId: string): number {
    const stmt = this.db.prepare('DELETE FROM messages WHERE session_id = ?');
    const result = stmt.run(sessionId);
    return result.changes;
  }

  // ==================== Action Item Operations ====================

  /**
   * Create an action item
   */
  createActionItem(sessionId: string, content: string): ActionItem {
    const id = randomUUID();
    
    const stmt = this.db.prepare(`
      INSERT INTO action_items (id, session_id, content, completed)
      VALUES (?, ?, ?, 0)
    `);
    
    stmt.run(id, sessionId, content);
    
    return this.getActionItem(id)!;
  }

  /**
   * Get an action item by ID
   */
  getActionItem(id: string): ActionItem | null {
    const stmt = this.db.prepare('SELECT * FROM action_items WHERE id = ?');
    return stmt.get(id) as ActionItem | null;
  }

  /**
   * List action items for a session
   */
  listActionItems(sessionId: string): ActionItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM action_items
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as ActionItem[];
  }

  /**
   * Toggle action item completion status
   */
  toggleActionItem(id: string): ActionItem | null {
    const stmt = this.db.prepare(`
      UPDATE action_items
      SET completed = NOT completed, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getActionItem(id);
  }

  /**
   * Delete an action item
   */
  deleteActionItem(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM action_items WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Database Info ====================

  /**
   * Get database statistics
   */
  getStats(): { profiles: number; sessions: number; messages: number; actionItems: number } {
    const profiles = (this.db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count;
    const sessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
    const messages = (this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
    const actionItems = (this.db.prepare('SELECT COUNT(*) as count FROM action_items').get() as { count: number }).count;
    
    return { profiles, sessions, messages, actionItems };
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabase(encryptionPassword?: string): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(DB_PATH, encryptionPassword);
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
