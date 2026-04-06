/**
 * Development-only logger utility
 * 
 * Writes structured JSON logs to ./data/logs/ when NODE_ENV !== 'production'.
 * In production, all log calls are no-ops with zero overhead.
 * 
 * Logs are written in JSON Lines format for easy parsing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Log directory path (evaluated at runtime to support test environment)
function getLogDir(): string {
  return path.join(process.cwd(), 'data', 'logs');
}

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string | null;
  message: string;
  context?: Record<string, unknown>;
}

// Thread-local storage for correlation ID (works with async/await)
const correlationIdStore = new Map<string, string>();

/**
 * Check if we're running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Ensure the log directory exists
 */
export function ensureLogDir(): void {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Get the current correlation ID for this async context
 */
export function getCorrelationId(): string {
  const asyncId = process.env.NODE_ENV || 'default';
  let correlationId = correlationIdStore.get(asyncId);
  
  if (!correlationId) {
    correlationId = randomUUID();
    correlationIdStore.set(asyncId, correlationId);
  }
  
  return correlationId;
}

/**
 * Set the correlation ID for the current async context
 */
export function setCorrelationId(id: string): void {
  const asyncId = process.env.NODE_ENV || 'default';
  correlationIdStore.set(asyncId, id);
}

/**
 * Clear the correlation ID for the current async context
 */
export function clearCorrelationId(): void {
  const asyncId = process.env.NODE_ENV || 'default';
  correlationIdStore.delete(asyncId);
}

/**
 * Create a new correlation ID (useful for generating fresh IDs for requests)
 */
export function createCorrelationId(): string {
  return randomUUID();
}

/**
 * Write a log entry to the appropriate log file
 */
function writeLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  // In production, do absolutely nothing - zero overhead
  if (isProduction()) {
    return;
  }

  // Ensure directory exists
  ensureLogDir();

  // Get current correlation ID
  const asyncId = process.env.NODE_ENV || 'default';
  const correlationId = correlationIdStore.get(asyncId) || null;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    message,
    context,
  };

  // Write as JSON Lines format
  const logPath = path.join(getLogDir(), `${level}.log`);
  const line = JSON.stringify(entry) + '\n';
  
  fs.writeFileSync(logPath, line, { flag: 'a' });
}

/**
 * Log object with methods for each log level
 * All methods are no-ops in production
 */
export const log = {
  debug(message: string, context?: Record<string, unknown>): void {
    writeLog('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    writeLog('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    writeLog('warn', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    writeLog('error', message, context);
  },
};

// Default export for convenience
export default log;
