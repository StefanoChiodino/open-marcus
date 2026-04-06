/**
 * Authentication event logger
 * 
 * Writes structured JSON logs specifically for auth events to ./data/logs/auth.log
 * when NODE_ENV !== 'production'. In production, all log calls are no-ops.
 * 
 * Logged events:
 * - Login attempts (success/failure)
 * - Logout events
 * - Session creation
 * - Auth errors
 */

import fs from 'node:fs';
import path from 'node:path';

// Auth log file name
const AUTH_LOG_FILE = 'auth.log';

/**
 * Check if we're running in production mode
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
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
 * Get the auth log file path
 */
function getAuthLogPath(): string {
  return path.join(process.cwd(), 'data', 'logs', AUTH_LOG_FILE);
}

/**
 * Auth event types
 */
export type AuthEventType = 
  | 'login_success' 
  | 'login_failure' 
  | 'logout' 
  | 'session_created' 
  | 'auth_error';

/**
 * Auth event log entry
 */
export interface AuthLogEntry {
  timestamp: string;
  event: AuthEventType;
  profileId?: string;
  sessionId?: string;
  userId?: string;
  reason?: string;
  error?: string;
  stack?: string;
  correlationId?: string | null;
}

/**
 * Log an authentication event
 * 
 * @param event - The type of auth event
 * @param data - Additional event data (profileId, sessionId, reason, error, etc.)
 */
export function logAuthEvent(
  event: AuthEventType,
  data: Partial<Omit<AuthLogEntry, 'timestamp' | 'event'>> = {}
): void {
  // In production, do absolutely nothing - zero overhead
  if (isProduction()) {
    return;
  }

  // Ensure directory exists
  ensureLogDir();

  const entry: AuthLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };

  // Write as JSON Line
  const logPath = getAuthLogPath();
  const line = JSON.stringify(entry) + '\n';
  
  fs.writeFileSync(logPath, line, { flag: 'a' });
}

/**
 * Log a successful login
 */
export function logLoginSuccess(profileId: string, correlationId?: string): void {
  logAuthEvent('login_success', { profileId, correlationId });
}

/**
 * Log a failed login attempt
 */
export function logLoginFailure(reason: string, correlationId?: string): void {
  logAuthEvent('login_failure', { reason, correlationId });
}

/**
 * Log a logout event
 */
export function logLogout(profileId: string, correlationId?: string): void {
  logAuthEvent('logout', { profileId, correlationId });
}

/**
 * Log session creation
 */
export function logSessionCreated(sessionId: string, profileId: string, correlationId?: string): void {
  logAuthEvent('session_created', { sessionId, profileId, correlationId });
}

/**
 * Log an authentication error
 */
export function logAuthError(error: Error, correlationId?: string): void {
  logAuthEvent('auth_error', { 
    error: error.message,
    stack: error.stack,
    correlationId 
  });
}

/**
 * Read auth log entries (for testing/verification)
 */
export function readAuthLog(): AuthLogEntry[] {
  const logPath = getAuthLogPath();
  
  if (!fs.existsSync(logPath)) {
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);
  
  return lines.map(line => JSON.parse(line) as AuthLogEntry);
}

/**
 * Clear auth log (for testing)
 */
export function clearAuthLog(): void {
  const logPath = getAuthLogPath();
  
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}

// Default export for convenience
export default {
  logAuthEvent,
  logLoginSuccess,
  logLoginFailure,
  logLogout,
  logSessionCreated,
  logAuthError,
  readAuthLog,
  clearAuthLog,
};
