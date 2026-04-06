/**
 * Database Logging Wrapper
 * 
 * Wraps DatabaseService with logging to track all queries.
 * Logs query type (SELECT/INSERT/UPDATE/DELETE), table name, parameters (sanitized - no message content),
 * and execution time. Writes to ./data/logs/db.log in development mode.
 * 
 * In production, all logging is disabled (zero overhead).
 */

import fs from 'node:fs';
import path from 'node:path';
import { isProduction } from './logger.js';

// Database log file path
const DB_LOG_FILE = 'db.log';

/**
 * Get the database log file path
 */
function getDbLogPath(): string {
  return path.join(process.cwd(), 'data', 'logs', DB_LOG_FILE);
}

/**
 * Ensure the log directory exists
 */
function ensureLogDir(): void {
  const logDir = path.join(process.cwd(), 'data', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Append a log entry to the database log file
 */
function writeDbLog(entry: Record<string, unknown>): void {
  if (isProduction()) {
    return;
  }
  
  ensureLogDir();
  const line = JSON.stringify(entry) + '\n';
  fs.writeFileSync(getDbLogPath(), line, { flag: 'a' });
}

/**
 * Parse query type from a SQL statement
 */
function parseQueryType(sql: string): string {
  const normalized = sql.trim().toUpperCase();
  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  if (normalized.startsWith('CREATE')) return 'CREATE';
  if (normalized.startsWith('DROP')) return 'DROP';
  if (normalized.startsWith('ALTER')) return 'ALTER';
  return 'OTHER';
}

/**
 * Extract table name from a SQL statement
 */
function extractTableName(sql: string): string {
  const normalized = sql.trim().toUpperCase();
  
  // Handle SELECT ... FROM table
  const fromMatch = normalized.match(/FROM\s+(\w+)/i);
  if (fromMatch) return fromMatch[1];
  
  // Handle INSERT INTO table
  const insertMatch = normalized.match(/INSERT\s+INTO\s+(\w+)/i);
  if (insertMatch) return insertMatch[1];
  
  // Handle UPDATE table
  const updateMatch = normalized.match(/UPDATE\s+(\w+)/i);
  if (updateMatch) return updateMatch[1];
  
  // Handle DELETE FROM table
  const deleteMatch = normalized.match(/DELETE\s+FROM\s+(\w+)/i);
  if (deleteMatch) return deleteMatch[1];
  
  return 'unknown';
}

/**
 * Tables that contain sensitive content data
 */
const SENSITIVE_TABLES = ['messages'];

/**
 * Fields that should never be logged for any table
 */
const SENSITIVE_FIELDS = ['content', 'password', 'password_hash', 'token', 'auth_token'];

/**
 * Check if a parameter contains sensitive content that should be redacted
 */
function isSensitiveValue(key: string, value: unknown): boolean {
  const lowerKey = key.toLowerCase();
  
  // Check if it's a sensitive field name
  for (const sensitiveField of SENSITIVE_FIELDS) {
    if (lowerKey.includes(sensitiveField)) {
      return true;
    }
  }
  
  // For messages table, always redact string values that look like content
  // (long strings that could be user messages)
  if (value && typeof value === 'string' && value.length > 100) {
    return true;
  }
  
  return false;
}

/**
 * Sanitize parameters for logging
 * Removes sensitive content but keeps structure for debugging
 */
function sanitizeParams(sql: string, params: unknown[]): { sanitized: unknown[]; sensitiveMasked: boolean } {
  const tableName = extractTableName(sql).toLowerCase();
  
  // If querying messages table, redact all string params
  if (SENSITIVE_TABLES.includes(tableName)) {
    return {
      sanitized: params.map((_p, i) => `[STRING_${i + 1}]`),
      sensitiveMasked: true
    };
  }
  
  // For other tables, check each param for sensitive field names
  // Note: In prepared statements, params are positional, not named
  // So we check if any param looks like sensitive content
  const sanitized = params.map(p => {
    if (isSensitiveValue('', p)) {
      return '[REDACTED]';
    }
    return p;
  });
  
  // Check if any redaction happened
  const sensitiveMasked = sanitized.some((p, i) => p !== params[i]);
  
  return { sanitized, sensitiveMasked };
}

/**
 * Log a database query execution
 */
export function logQuery(params: {
  sql: string;
  queryType: string;
  table: string;
  durationMs: number;
  rowsReturned?: number;
  error?: string;
}): void {
  if (isProduction()) {
    return;
  }
  
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: params.error ? 'error' : 'info',
    type: 'db_query',
    queryType: params.queryType,
    table: params.table,
    durationMs: params.durationMs,
    sql: params.sql, // Full SQL is okay - no user content in SQL statements
  };
  
  if (params.rowsReturned !== undefined) {
    entry.rowsReturned = params.rowsReturned;
  }
  
  if (params.error) {
    entry.error = params.error;
  }
  
  writeDbLog(entry);
}

/**
 * Log transaction boundaries
 */
export function logTransaction(params: {
  action: 'begin' | 'commit' | 'rollback';
  durationMs?: number;
  error?: string;
}): void {
  if (isProduction()) {
    return;
  }
  
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: params.error ? 'error' : 'info',
    type: 'db_transaction',
    action: params.action,
  };
  
  if (params.durationMs !== undefined) {
    entry.durationMs = params.durationMs;
  }
  
  if (params.error) {
    entry.error = params.error;
  }
  
  writeDbLog(entry);
}

/**
 * Create timing helper for query execution
 */
export function startQueryTimer(): () => number {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };
}

// Re-export query helpers for external use
export { parseQueryType, extractTableName, sanitizeParams };
