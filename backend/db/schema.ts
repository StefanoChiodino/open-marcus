/**
 * Database schema definitions for OpenMarcus
 */

export interface User {
  id: string;
  username: string;
  password_hash: string; // argon2id hash
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string; // FK to users (1:1)
  name: string;
  bio: string | null; // Bio is stored in encrypted_data (plaintext column is legacy, always NULL)
  encrypted_data: string; // JSON string of EncryptedData (contains encrypted name + bio)
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string; // FK to users (1:many)
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
  user_id: string; // FK to users (many:1 via session)
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  user_id: string; // FK to users (many:1 via session)
  session_id: string;
  content: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SQL statements to create the schema (without user_id - added in migration 004)
 */
export const CREATE_TABLES_SQL = `
-- Profiles table: stores user profile data
-- bio is stored ONLY in encrypted_data, not in plaintext for privacy
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT, -- kept for schema compatibility but always NULL (bio is in encrypted_data)
  encrypted_data TEXT NOT NULL, -- contains encrypted { name, bio }
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
 * SQL for users table (migration 004)
 * SQLite doesn't support adding FOREIGN KEY constraints via ALTER TABLE,
 * so we recreate the tables with proper FK constraints.
 */
export const CREATE_USERS_TABLE_SQL = `
-- Users table: stores user accounts for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

/**
 * SQL for adding user_id foreign keys to existing tables (migration 004)
 * Since SQLite doesn't support ALTER TABLE ADD COLUMN with FOREIGN KEY,
 * we recreate the tables. This migration clears all existing user data.
 */
export const ADD_USER_ID_COLUMNS_SQL = `
-- Recreate profiles table with user_id column
-- bio is stored ONLY in encrypted_data for privacy (plaintext bio column kept NULL)
CREATE TABLE IF NOT EXISTS profiles_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT, -- kept for schema compatibility but always NULL
  encrypted_data TEXT NOT NULL, -- contains encrypted { name, bio }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data (empty since we clear below)
INSERT INTO profiles_new (id, user_id, name, bio, encrypted_data, created_at, updated_at)
SELECT id, '', name, NULL, encrypted_data, created_at, updated_at FROM profiles;

-- Drop old table and rename new one
DROP TABLE profiles;
ALTER TABLE profiles_new RENAME TO profiles;

-- Recreate sessions table with user_id column
CREATE TABLE IF NOT EXISTS sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'intro' CHECK(status IN ('intro', 'active', 'closing', 'summary')),
  summary TEXT,
  action_items TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

INSERT INTO sessions_new (id, user_id, profile_id, status, summary, action_items, started_at, ended_at, created_at, updated_at)
SELECT id, '', profile_id, status, summary, action_items, started_at, ended_at, created_at, updated_at FROM sessions;

DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- Recreate messages table with user_id column
CREATE TABLE IF NOT EXISTS messages_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

INSERT INTO messages_new (id, user_id, session_id, role, content, created_at)
SELECT id, '', session_id, role, content, created_at FROM messages;

DROP TABLE messages;
ALTER TABLE messages_new RENAME TO messages;

-- Recreate action_items table with user_id column
CREATE TABLE IF NOT EXISTS action_items_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

INSERT INTO action_items_new (id, user_id, session_id, content, completed, created_at, updated_at)
SELECT id, '', session_id, content, completed, created_at, updated_at FROM action_items;

DROP TABLE action_items;
ALTER TABLE action_items_new RENAME TO action_items;

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON action_items(user_id);
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
DROP TABLE IF EXISTS users;
`;
