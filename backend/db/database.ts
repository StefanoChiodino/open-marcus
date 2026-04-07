import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { MigrationRunner } from './migrate.js';
import { encryptObject, decryptObject, EncryptedData } from '../crypto/encryption.js';
import type { Profile, Session, Message, ActionItem, User } from './schema.js';
import type { ContentItem } from '../lib/content-schema.js';
import { logQuery, logTransaction, startQueryTimer, parseQueryType, extractTableName } from '../lib/db-logger.js';

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
   * Create a new profile with encrypted data.
   * For single-user mode, automatically associates the profile with a default user.
   */
  createProfile(name: string, bio: string | null = null, data: object = {}): Profile {
    // Get or create the default user for single-user mode
    const defaultUser = this.getOrCreateDefaultUser();
    
    const id = randomUUID();
    const encryptedData = encryptObject({ ...data, name, bio }, this.encryptionPassword);
    
    const sql = `
      INSERT INTO profiles (id, user_id, name, bio, encrypted_data)
      VALUES (?, ?, ?, ?, ?)
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    stmt.run(id, defaultUser.id, name, bio, JSON.stringify(encryptedData));
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
    });
    
    return this.getProfile(id)!;
  }

  /**
   * Get a profile by ID
   */
  getProfile(id: string): Profile | null {
    const sql = 'SELECT * FROM profiles WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(id) as Profile | null;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    return result;
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, name: string, bio: string | null = null, data: object = {}): Profile | null {
    const encryptedData = encryptObject({ ...data, name, bio }, this.encryptionPassword);
    
    const sql = `
      UPDATE profiles
      SET name = ?, bio = ?, encrypted_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(name, bio, JSON.stringify(encryptedData), id);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getProfile(id);
  }

  /**
   * Delete a profile and all associated data (cascade)
   */
  deleteProfile(id: string): boolean {
    const sql = 'DELETE FROM profiles WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    return result.changes > 0;
  }

  /**
   * List all profiles
   */
  listProfiles(): Profile[] {
    const sql = 'SELECT * FROM profiles ORDER BY created_at DESC';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const results = stmt.all() as Profile[];
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: results.length,
    });
    
    return results;
  }

  /**
   * Get the raw encrypted_data string from the database (for encryption verification)
   * Returns the encrypted_data exactly as stored, without any decryption or parsing
   */
  getRawProfileData(id: string): string | null {
    const sql = 'SELECT encrypted_data FROM profiles WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const row = stmt.get(id) as { encrypted_data: string } | undefined;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: row ? 1 : 0,
    });
    
    return row?.encrypted_data || null;
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
   * Create a new session.
   * For single-user mode, automatically associates the session with the default user.
   */
  createSession(profileId: string): Session {
    // Get the profile to find its user_id
    const profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    const id = randomUUID();
    
    const sql = `
      INSERT INTO sessions (id, user_id, profile_id, status, started_at)
      VALUES (?, ?, ?, 'intro', datetime('now'))
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    stmt.run(id, profile.user_id, profileId);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
    });
    
    return this.getSession(id)!;
  }

  /**
   * Get a session by ID
   * Decrypts summary and action_items if present.
   */
  getSession(id: string): Session | null {
    const sql = 'SELECT * FROM sessions WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(id) as Session | null;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    if (result) {
      this.decryptSessionFields(result);
    }
    
    return result;
  }

  /**
   * Helper to decrypt session fields (summary and action_items) in place.
   */
  private decryptSessionFields(session: Session): void {
    // Decrypt summary if present and encrypted
    if (session.summary) {
      try {
        const encryptedSummary: EncryptedData = JSON.parse(session.summary);
        if (encryptedSummary.iv && encryptedSummary.authTag && encryptedSummary.salt && encryptedSummary.ciphertext) {
          const decrypted = decryptObject<{ summary: string }>(encryptedSummary, this.encryptionPassword);
          session.summary = decrypted.summary;
        }
      } catch {
        // If decryption fails, leave as-is (might be legacy plaintext)
      }
    }
    
    // Decrypt action_items if present and encrypted
    if (session.action_items) {
      try {
        const encryptedActionItems: EncryptedData = JSON.parse(session.action_items);
        if (encryptedActionItems.iv && encryptedActionItems.authTag && encryptedActionItems.salt && encryptedActionItems.ciphertext) {
          const decrypted = decryptObject<{ actionItems: string[] }>(encryptedActionItems, this.encryptionPassword);
          session.action_items = JSON.stringify(decrypted.actionItems);
        }
      } catch {
        // If decryption fails, leave as-is (might be legacy plaintext)
      }
    }
  }

  /**
   * Update session status
   */
  updateSessionStatus(id: string, status: Session['status']): Session | null {
    const sql = `
      UPDATE sessions
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(status, id);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getSession(id);
  }

  /**
   * End a session
   * Summary and action items are encrypted before storage.
   */
  endSession(id: string, summary: string, actionItems: string[]): Session | null {
    // Encrypt the summary and action items
    const encryptedSummary = encryptObject({ summary }, this.encryptionPassword);
    const encryptedActionItems = encryptObject({ actionItems }, this.encryptionPassword);
    
    const sql = `
      UPDATE sessions
      SET status = 'summary', summary = ?, action_items = ?,
          ended_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(
      JSON.stringify(encryptedSummary),
      JSON.stringify(encryptedActionItems),
      id
    );
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    if (result.changes === 0) {
      return null;
    }
    
    return this.getSession(id);
  }

  /**
   * List sessions for a profile
   * Decrypts summary and action_items for each session.
   */
  listSessions(profileId: string): Session[] {
    const sql = `
      SELECT * FROM sessions
      WHERE profile_id = ?
      ORDER BY started_at DESC
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const results = stmt.all(profileId) as Session[];
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: results.length,
    });
    
    // Decrypt session data
    for (const session of results) {
      this.decryptSessionFields(session);
    }
    
    return results;
  }

  /**
   * List all sessions
   * Decrypts summary and action_items for each session.
   */
  listAllSessions(): Session[] {
    const sql = 'SELECT * FROM sessions ORDER BY started_at DESC';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const results = stmt.all() as Session[];
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: results.length,
    });
    
    // Decrypt session data
    for (const session of results) {
      this.decryptSessionFields(session);
    }
    
    return results;
  }

  /**
   * Delete a session and all associated messages
   */
  deleteSession(id: string): boolean {
    const sql = 'DELETE FROM sessions WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    return result.changes > 0;
  }

  // ==================== Message Operations ====================

  /**
   * Add a message to a session.
   * For single-user mode, automatically associates the message with the default user.
   * Message content is encrypted before storage.
   */
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Message {
    // Get the session to find its user_id (don't decrypt yet, just get the row)
    const sessionSql = 'SELECT user_id FROM sessions WHERE id = ?';
    const sessionStmt = this.db.prepare(sessionSql);
    const session = sessionStmt.get(sessionId) as { user_id: string } | undefined;
    if (!session) {
      throw new Error('Session not found');
    }
    
    const id = randomUUID();
    
    // Encrypt the message content
    const encryptedContent = encryptObject({ content }, this.encryptionPassword);
    
    const sql = `
      INSERT INTO messages (id, user_id, session_id, role, content)
      VALUES (?, ?, ?, ?, ?)
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    stmt.run(id, session.user_id, sessionId, role, JSON.stringify(encryptedContent));
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      // Note: content is NOT logged - it's user data
    });
    
    return this.getMessage(id)!;
  }

  /**
   * Get a message by ID
   * Decrypts message content if present and encrypted.
   */
  getMessage(id: string): Message | null {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(id) as Message | null;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    if (result && result.content) {
      try {
        const encryptedContent: EncryptedData = JSON.parse(result.content);
        if (encryptedContent.iv && encryptedContent.authTag && encryptedContent.salt && encryptedContent.ciphertext) {
          const decrypted = decryptObject<{ content: string }>(encryptedContent, this.encryptionPassword);
          result.content = decrypted.content;
        }
      } catch {
        // If decryption fails, leave as-is (might be legacy plaintext)
      }
    }
    
    return result;
  }

  /**
   * List messages for a session
   * Decrypts message content for each message.
   */
  listMessages(sessionId: string): Message[] {
    const sql = `
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const results = stmt.all(sessionId) as Message[];
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: results.length,
      // Note: message content is NOT logged
    });
    
    // Decrypt content for each message
    for (const message of results) {
      if (message.content) {
        try {
          const encryptedContent: EncryptedData = JSON.parse(message.content);
          if (encryptedContent.iv && encryptedContent.authTag && encryptedContent.salt && encryptedContent.ciphertext) {
            const decrypted = decryptObject<{ content: string }>(encryptedContent, this.encryptionPassword);
            message.content = decrypted.content;
          }
        } catch {
          // If decryption fails, leave as-is (might be legacy plaintext)
        }
      }
    }
    
    return results;
  }

  /**
   * Delete all messages for a session
   */
  deleteMessages(sessionId: string): number {
    const sql = 'DELETE FROM messages WHERE session_id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(sessionId);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    return result.changes;
  }

  // ==================== Action Item Operations ====================

  /**
   * Create an action item.
   * For single-user mode, automatically associates the action item with the default user.
   * Action item content is encrypted before storage.
   */
  createActionItem(sessionId: string, content: string): ActionItem {
    // Get the session to find its user_id (raw query to avoid decryption)
    const sessionSql = 'SELECT user_id FROM sessions WHERE id = ?';
    const sessionStmt = this.db.prepare(sessionSql);
    const session = sessionStmt.get(sessionId) as { user_id: string } | undefined;
    if (!session) {
      throw new Error('Session not found');
    }
    
    const id = randomUUID();
    
    // Encrypt the action item content
    const encryptedContent = encryptObject({ content }, this.encryptionPassword);
    
    const stmt = this.db.prepare(`
      INSERT INTO action_items (id, user_id, session_id, content, completed)
      VALUES (?, ?, ?, ?, 0)
    `);
    
    stmt.run(id, session.user_id, sessionId, JSON.stringify(encryptedContent));
    
    return this.getActionItem(id)!;
  }

  /**
   * Get an action item by ID
   * Decrypts action item content if present and encrypted.
   */
  getActionItem(id: string): ActionItem | null {
    const stmt = this.db.prepare('SELECT * FROM action_items WHERE id = ?');
    const result = stmt.get(id) as ActionItem | null;
    
    if (result && result.content) {
      try {
        const encryptedContent: EncryptedData = JSON.parse(result.content);
        if (encryptedContent.iv && encryptedContent.authTag && encryptedContent.salt && encryptedContent.ciphertext) {
          const decrypted = decryptObject<{ content: string }>(encryptedContent, this.encryptionPassword);
          result.content = decrypted.content;
        }
      } catch {
        // If decryption fails, leave as-is (might be legacy plaintext)
      }
    }
    
    return result;
  }

  /**
   * List action items for a session
   * Decrypts action item content for each item.
   */
  listActionItems(sessionId: string): ActionItem[] {
    const stmt = this.db.prepare(`
      SELECT * FROM action_items
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    const results = stmt.all(sessionId) as ActionItem[];
    
    // Decrypt content for each action item
    for (const item of results) {
      if (item.content) {
        try {
          const encryptedContent: EncryptedData = JSON.parse(item.content);
          if (encryptedContent.iv && encryptedContent.authTag && encryptedContent.salt && encryptedContent.ciphertext) {
            const decrypted = decryptObject<{ content: string }>(encryptedContent, this.encryptionPassword);
            item.content = decrypted.content;
          }
        } catch {
          // If decryption fails, leave as-is (might be legacy plaintext)
        }
      }
    }
    
    return results;
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
    const sql = 'DELETE FROM action_items WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
    
    return result.changes > 0;
  }

  // ==================== Stoic Content Operations ====================

  /**
   * Seed stoic content items into the database
   */
  seedContent(items: ContentItem[]): number {
    logTransaction({ action: 'begin' });
    const getDuration = startQueryTimer();
    
    const insertMany = this.db.transaction((contentItems: ContentItem[]) => {
      let inserted = 0;
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO stoic_content 
          (id, author, source, book, section, letter, type, content, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const item of contentItems) {
        const result = insertStmt.run(
          item.id,
          item.author,
          item.source,
          item.book || null,
          item.section || null,
          item.letter || null,
          item.type,
          item.content,
          JSON.stringify(item.tags)
        );
        if (result.changes > 0) {
          inserted++;
        }
      }
      return inserted;
    });
    
    const result = insertMany(items);
    
    logTransaction({ action: 'commit', durationMs: getDuration() });
    
    return result;
  }

  /**
   * Get random stoic quotes
   */
  getRandomQuotes(count: number = 3): ContentItem[] {
    const sql = `
      SELECT * FROM stoic_content
      ORDER BY RANDOM()
      LIMIT ?
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(count) as Array<Record<string, unknown>>;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: rows.length,
    });
    
    return rows.map(row => this.rowToContentItem(row));
  }

  /**
   * Search stoic content by query, tag, or author
   */
  searchContent(query?: string, tag?: string, author?: string, limit: number = 10): ContentItem[] {
    let sql = 'SELECT * FROM stoic_content WHERE 1=1';
    const params: (string | number)[] = [];

    if (query) {
      sql += ' AND (content LIKE ? OR tags LIKE ?)';
      const searchPattern = `%${query}%`;
      params.push(searchPattern, searchPattern);
    }

    if (tag) {
      sql += ' AND tags LIKE ?';
      params.push(`%"${tag}"%`);
    }

    if (author) {
      sql += ' AND author = ?';
      params.push(author);
    }

    sql += ' LIMIT ?';
    params.push(limit);

    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Array<Record<string, unknown>>;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: rows.length,
    });
    
    return rows.map(row => this.rowToContentItem(row));
  }

  /**
   * Get content by tag for RAG context injection
   */
  getContentByTags(tags: string[], limit: number = 5): ContentItem[] {
    if (tags.length === 0) {
      return this.getRandomQuotes(limit);
    }

    const tagPatterns = tags.map(t => `%"${t}"%`);
    const placeholders = tagPatterns.map(() => 'tags LIKE ?').join(' OR ');
    const sql = `
      SELECT * FROM stoic_content
      WHERE ${placeholders}
      ORDER BY RANDOM()
      LIMIT ?
    `;
    const getDuration = startQueryTimer();

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...tagPatterns, limit) as Array<Record<string, unknown>>;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: rows.length,
    });
    
    return rows.map(row => this.rowToContentItem(row));
  }

  /**
   * Get content formatted for AI context injection (RAG)
   */
  getContextForAI(tags: string[], limit: number = 5): string {
    const items = this.getContentByTags(tags, limit);
    
    if (items.length === 0) {
      return '';
    }

    const contextLines = items.map(item => {
      const source = [item.source, item.book, item.letter, item.section]
        .filter(Boolean)
        .join(', ');
      return `"${item.content}" — ${item.author}, ${source}`;
    });

    return `Relevant stoic wisdom to draw from:\n${contextLines.join('\n')}`;
  }

  /**
   * Get content count
   */
  getContentCount(): number {
    const sql = 'SELECT COUNT(*) as count FROM stoic_content';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get() as { count: number };
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: 1,
    });
    
    return result.count;
  }

  /**
   * Get all unique tags
   */
  getAllTags(): string[] {
    const sql = 'SELECT DISTINCT tags FROM stoic_content';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as Array<{ tags: string }>;
    const tagSet = new Set<string>();
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: rows.length,
    });
    
    for (const row of rows) {
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        tagSet.add(tag);
      }
    }
    
    return Array.from(tagSet).sort();
  }

  /**
   * Convert a database row to a ContentItem
   */
  private rowToContentItem(row: Record<string, unknown>): ContentItem {
    return {
      id: row.id as string,
      author: row.author as string,
      source: row.source as string,
      book: row.book as string | undefined,
      section: row.section as string | undefined,
      letter: row.letter as string | undefined,
      type: row.type as 'quote' | 'saying' | 'excerpt',
      content: row.content as string,
      tags: JSON.parse(row.tags as string) as string[],
    };
  }

  // ==================== Import/Export Operations ====================

  /**
   * Clear all user data (profiles, sessions, messages, action items)
   * Does NOT clear stoic content library
   */
  clearAllUserData(): { profiles: number; sessions: number; messages: number; actionItems: number } {
    const clearTransaction = this.db.transaction(() => {
      // Delete in order respecting foreign keys
      const actionItemResult = this.db.prepare('DELETE FROM action_items').run();
      const messageResult = this.db.prepare('DELETE FROM messages').run();
      const sessionResult = this.db.prepare('DELETE FROM sessions').run();
      const profileResult = this.db.prepare('DELETE FROM profiles').run();
      
      return {
        profiles: profileResult.changes,
        sessions: sessionResult.changes,
        messages: messageResult.changes,
        actionItems: actionItemResult.changes,
      };
    });
    
    return clearTransaction();
  }

  /**
   * Import all user data from exported JSON.
   * For single-user mode, associates all imported data with the default user.
   */
  importData(data: {
    version: string;
    profiles: Profile[];
    sessions: Session[];
    messages: Message[];
    actionItems: ActionItem[];
    content?: ContentItem[];
  }): { profiles: number; sessions: number; messages: number; actionItems: number; content?: number } {
    // Get or create the default user for single-user mode
    const defaultUser = this.getOrCreateDefaultUser();
    
    const importTransaction = this.db.transaction(() => {
      const insertProfile = this.db.prepare(`
        INSERT OR REPLACE INTO profiles (id, user_id, name, bio, encrypted_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertSession = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (id, user_id, profile_id, status, summary, action_items, started_at, ended_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMessage = this.db.prepare(`
        INSERT OR REPLACE INTO messages (id, user_id, session_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const insertActionItem = this.db.prepare(`
        INSERT OR REPLACE INTO action_items (id, user_id, session_id, content, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertContent = this.db.prepare(`
        INSERT OR REPLACE INTO stoic_content (id, author, source, book, section, letter, type, content, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let profileCount = 0;
      let sessionCount = 0;
      let messageCount = 0;
      let actionItemCount = 0;
      let contentCount = 0;

      // Import profiles
      if (data.profiles && Array.isArray(data.profiles)) {
        for (const profile of data.profiles) {
          insertProfile.run(
            profile.id,
            defaultUser.id,
            profile.name,
            profile.bio || null,
            profile.encrypted_data || null,
            profile.created_at,
            profile.updated_at,
          );
          profileCount++;
        }
      }

      // Import sessions
      if (data.sessions && Array.isArray(data.sessions)) {
        for (const session of data.sessions) {
          insertSession.run(
            session.id,
            defaultUser.id,
            session.profile_id,
            session.status,
            session.summary || null,
            session.action_items || null,
            session.started_at,
            session.ended_at || null,
            session.created_at,
            session.updated_at,
          );
          sessionCount++;
        }
      }

      // Import messages
      if (data.messages && Array.isArray(data.messages)) {
        for (const message of data.messages) {
          insertMessage.run(
            message.id,
            defaultUser.id,
            message.session_id,
            message.role,
            message.content,
            message.created_at,
          );
          messageCount++;
        }
      }

      // Import action items
      if (data.actionItems && Array.isArray(data.actionItems)) {
        for (const actionItem of data.actionItems) {
          insertActionItem.run(
            actionItem.id,
            defaultUser.id,
            actionItem.session_id,
            actionItem.content,
            actionItem.completed ? 1 : 0,
            actionItem.created_at,
            actionItem.updated_at,
          );
          actionItemCount++;
        }
      }

      // Optionally import stoic content
      if (data.content && Array.isArray(data.content)) {
        for (const item of data.content) {
          insertContent.run(
            item.id,
            item.author,
            item.source,
            item.book || null,
            item.section || null,
            item.letter || null,
            item.type,
            item.content,
            JSON.stringify(item.tags),
          );
          contentCount++;
        }
      }

      return {
        profiles: profileCount,
        sessions: sessionCount,
        messages: messageCount,
        actionItems: actionItemCount,
        content: contentCount,
      };
    });

    return importTransaction();
  }

  // ==================== Settings Operations ====================

  /**
   * Get a setting value by key
   */
  getSetting(key: string): string | null {
    const sql = 'SELECT value FROM settings WHERE key = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const row = stmt.get(key) as { value: string } | undefined;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: row ? 1 : 0,
    });
    
    return row?.value || null;
  }

  /**
   * Set or update a setting value
   */
  setSetting(key: string, value: string): void {
    const sql = 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    stmt.run(key, value, value);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
    });
  }

  /**
   * Delete a setting by key
   */
  deleteSetting(key: string): void {
    const sql = 'DELETE FROM settings WHERE key = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run(key);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
  }

  // ==================== User Operations ====================

  /**
   * Create a new user
   */
  createUser(username: string, passwordHash: string): User {
    const id = randomUUID();
    
    const sql = `
      INSERT INTO users (id, username, password_hash)
      VALUES (?, ?, ?)
    `;
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    stmt.run(id, username, passwordHash);
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
    });
    
    return this.getUserById(id)!;
  }

  /**
   * Get or create the default user for single-user mode.
   * This is used when creating profiles without explicit user authentication.
   */
  getOrCreateDefaultUser(): User {
    // Check if a default user already exists
    const defaultUsername = 'default_user';
    const existingUser = this.getUserByUsername(defaultUsername);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create a default user with a placeholder password hash
    // Note: In single-user mode without auth, this is a placeholder
    // The actual auth system will set a proper password when implemented
    const placeholderHash = 'placeholder_hash_for_single_user_mode';
    return this.createUser(defaultUsername, placeholderHash);
  }

  /**
   * Get a user by ID
   */
  getUserById(id: string): User | null {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(id) as User | null;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    return result;
  }

  /**
   * Get a user by username
   */
  getUserByUsername(username: string): User | null {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(username) as User | null;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    return result;
  }

  /**
   * Check if a username exists
   */
  usernameExists(username: string): boolean {
    const sql = 'SELECT 1 FROM users WHERE username = ?';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.get(username) !== undefined;
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result ? 1 : 0,
    });
    
    return result;
  }

  /**
   * Delete all users (for testing purposes)
   */
  deleteAllUsers(): void {
    const sql = 'DELETE FROM users';
    const getDuration = startQueryTimer();
    
    const stmt = this.db.prepare(sql);
    const result = stmt.run();
    
    logQuery({
      sql,
      queryType: parseQueryType(sql),
      table: extractTableName(sql),
      durationMs: getDuration(),
      rowsReturned: result.changes,
    });
  }

  // ==================== Database Info ====================

  /**
   * Get database statistics
   */
  getStats(): { profiles: number; sessions: number; messages: number; actionItems: number } {
    const getDuration = startQueryTimer();
    
    const profiles = (this.db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }).count;
    const sessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
    const messages = (this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count;
    const actionItems = (this.db.prepare('SELECT COUNT(*) as count FROM action_items').get() as { count: number }).count;
    
    logQuery({
      sql: 'SELECT COUNT(*) FROM ... (batch stats query)',
      queryType: 'SELECT',
      table: 'multiple',
      durationMs: getDuration(),
      rowsReturned: 4,
    });
    
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
