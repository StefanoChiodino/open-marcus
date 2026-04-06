/**
 * API Request Logging Middleware
 * 
 * Express middleware that logs all API requests and responses.
 * Each request gets a unique correlation ID for tracing.
 * Logs request details on arrival, response details on completion.
 * 
 * When NODE_ENV === 'production', this middleware does nothing (zero overhead).
 */

import { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Log file name
const API_LOG_FILE = 'api.log';

// Sensitive headers to redact
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];

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
 * Get the API log file path
 */
function getApiLogPath(): string {
  return path.join(process.cwd(), 'data', 'logs', API_LOG_FILE);
}

/**
 * Generate a unique correlation ID using randomUUID
 */
function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Redact sensitive headers from headers object
 */
function redactSensitiveHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const redacted = { ...headers };
  
  for (const header of SENSITIVE_HEADERS) {
    if (header in redacted) {
      redacted[header] = '[REDACTED]';
    }
  }
  
  return redacted;
}

/**
 * API log entry for requests
 */
export interface ApiRequestLogEntry {
  timestamp: string;
  type: 'request';
  correlationId: string;
  method: string;
  path: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * API log entry for responses
 */
export interface ApiResponseLogEntry {
  timestamp: string;
  type: 'response';
  correlationId: string;
  statusCode: number;
  durationMs: number;
}

/**
 * Write an API log entry
 */
function writeApiLog(entry: ApiRequestLogEntry | ApiResponseLogEntry): void {
  // In production, do absolutely nothing - zero overhead
  if (isProduction()) {
    return;
  }

  // Ensure directory exists
  ensureLogDir();

  // Write as JSON Line
  const logPath = getApiLogPath();
  const line = JSON.stringify(entry) + '\n';
  
  fs.writeFileSync(logPath, line, { flag: 'a' });
}

/**
 * API Request Logging Middleware
 * 
 * Logs:
 * - Request method, path, query params, headers (with sensitive data redacted)
 * - On response: status code and duration
 * 
 * Uses correlation ID to link request/response pairs in logs.
 */
export function apiLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  // In production, skip all processing - zero overhead
  if (isProduction()) {
    return next();
  }

  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  // Log request details
  const requestEntry: ApiRequestLogEntry = {
    timestamp: new Date().toISOString(),
    type: 'request',
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query as Record<string, string | string[] | undefined>,
    headers: redactSensitiveHeaders(req.headers as Record<string, string | string[] | undefined>),
  };

  writeApiLog(requestEntry);

  // Capture response details when response finishes
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;

    const responseEntry: ApiResponseLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'response',
      correlationId,
      statusCode: res.statusCode,
      durationMs,
    };

    writeApiLog(responseEntry);
  });

  // Store correlation ID on request for downstream use
  (req as Request & { correlationId?: string }).correlationId = correlationId;

  next();
}

/**
 * Read API log entries (for testing/verification)
 */
export function readApiLog(): (ApiRequestLogEntry | ApiResponseLogEntry)[] {
  const logPath = getApiLogPath();
  
  if (!fs.existsSync(logPath)) {
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);
  
  return lines.map(line => JSON.parse(line) as ApiRequestLogEntry | ApiResponseLogEntry);
}

/**
 * Clear API log (for testing)
 */
export function clearApiLog(): void {
  const logPath = getApiLogPath();
  
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }
}

// Default export for convenience
export default {
  apiLogMiddleware,
  readApiLog,
  clearApiLog,
};
