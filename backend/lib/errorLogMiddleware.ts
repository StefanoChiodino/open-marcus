/**
 * Error Logging Middleware
 * 
 * Express error handling middleware that logs all unhandled errors and 500 responses.
 * Each error is logged with full stack trace, request context, and correlation ID.
 * 
 * In development (NODE_ENV !== 'production'):
 * - Logs to ./data/logs/error.log with full details
 * - Returns detailed error to client
 * 
 * In production (NODE_ENV === 'production'):
 * - Errors are NOT logged to files (zero overhead)
 * - Returns generic error message to client
 */

import { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

// Log file name
const ERROR_LOG_FILE = 'error.log';

// Extended error interface to capture status code
interface HttpError extends Error {
  statusCode?: number;
  status?: number;
}

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
 * Get the error log file path
 */
function getErrorLogPath(): string {
  return path.join(process.cwd(), 'data', 'logs', ERROR_LOG_FILE);
}

/**
 * Error log entry structure
 */
export interface ErrorLogEntry {
  timestamp: string;
  type: 'error';
  correlationId: string | null;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
  request: {
    method: string;
    path: string;
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
  };
  response?: {
    statusCode: number;
  };
}

/**
 * Write an error log entry
 */
function writeErrorLog(entry: ErrorLogEntry): void {
  // In production, do absolutely nothing - zero overhead
  if (isProduction()) {
    return;
  }

  // Ensure directory exists
  ensureLogDir();

  // Write as JSON Line
  const logPath = getErrorLogPath();
  const line = JSON.stringify(entry) + '\n';
  
  fs.writeFileSync(logPath, line, { flag: 'a' });
}

/**
 * Get correlation ID from request object
 * The correlation ID is set by apiLogMiddleware
 */
function getCorrelationIdFromRequest(req: Request): string | null {
  return (req as Request & { correlationId?: string }).correlationId || null;
}

/**
 * Sanitize headers to remove sensitive data
 */
function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];
  const sanitized = { ...headers };
  
  for (const header of SENSITIVE_HEADERS) {
    if (header in sanitized) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Error Logging Middleware
 * 
 * Catches all errors and logs them with full context.
 * In production, returns a generic error message without details.
 */
export function errorLogMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const httpError = err as HttpError;
  const statusCode = httpError.statusCode || httpError.status || 500;
  const correlationId = getCorrelationIdFromRequest(req);

  // Log error entry (development only)
  const errorLogEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    type: 'error',
    correlationId,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query as Record<string, string | string[] | undefined>,
      headers: sanitizeHeaders(req.headers as Record<string, string | string[] | undefined>),
    },
    response: {
      statusCode,
    },
  };

  writeErrorLog(errorLogEntry);

  // In production, return generic error without details
  if (isProduction()) {
    res.status(statusCode).json({ error: 'Internal server error' });
    return;
  }

  // In development, return detailed error
  res.status(statusCode).json({
    error: err.message,
    name: err.name,
    ...(err.stack && process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
}

/**
 * Read error log entries (for testing/verification)
 */
export function readErrorLog(): ErrorLogEntry[] {
  const logPath = getErrorLogPath();
  
  if (!fs.existsSync(logPath)) {
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);
  
  return lines.map(line => JSON.parse(line) as ErrorLogEntry);
}

/**
 * Clear error log (for testing)
 */
export function clearErrorLog(): void {
  const logPath = getErrorLogPath();
  
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}

// Default export for convenience
export default {
  errorLogMiddleware,
  readErrorLog,
  clearErrorLog,
};
