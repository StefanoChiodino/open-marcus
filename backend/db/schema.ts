/**
 * Database schema definitions for OpenMarcus
 */

export interface Profile {
  id: string;
  name: string;
  bio: string | null;
  encrypted_data: string; // JSON string of EncryptedData
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  profile_id: string;
  status: 'intro' | 'active' | 'closing' | 'summary';
  summary: string | null;
  action_items: string | null; // JSON string of action items array
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  session_id: string;
  content: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SQL statements to create the schema
 */
export const CREATE_TABLES_SQL = `
-- Profiles table: stores user profile data (encrypted)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  encrypted_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table: stores meditation sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intro' CHECK(status IN ('intro', 'active', 'closing', 'summary')),
  summary TEXT,
  action_items TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Messages table: stores individual messages in sessions
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Action items table: stores action items from sessions
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_action_items_session_id ON action_items(session_id);
`;

/**
 * SQL to create the stoic_content table and seed initial data
 */
export const CREATE_STOIC_CONTENT_SQL = `
-- Stoic content table: stores quotes, excerpts, and sayings from stoic philosophers
CREATE TABLE IF NOT EXISTS stoic_content (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  source TEXT NOT NULL,
  book TEXT,
  section TEXT,
  letter TEXT,
  type TEXT NOT NULL CHECK(type IN ('quote', 'saying', 'excerpt')),
  content TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array of tags
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for full-text search on content
CREATE INDEX IF NOT EXISTS idx_stoic_content_tags ON stoic_content(tags);
CREATE INDEX IF NOT EXISTS idx_stoic_content_author ON stoic_content(author);
`;

/**
 * SQL for the settings table (migration 003)
 */
export const CREATE_SETTINGS_TABLE_SQL = `
-- Settings table: stores application settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS stoic_content;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS action_items;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS profiles;
`;
