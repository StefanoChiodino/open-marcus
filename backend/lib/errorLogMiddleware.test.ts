/**
 * Tests for Error Logging Middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorLogMiddleware, readErrorLog, clearErrorLog } from './errorLogMiddleware.js';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import os from 'node:os';

describe('errorLogMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusCode: number = 500;
  let jsonData: any = null;

  // Use a unique test directory per test run to avoid state leakage
  const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testBaseDir = path.join(os.tmpdir(), 'error-logger-tests', testId);
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create unique test directory for this test
    fs.mkdirSync(testBaseDir, { recursive: true });
    process.chdir(testBaseDir);
    
    // Set to development mode
    process.env.NODE_ENV = 'development';
    
    // Clear error log before each test
    clearErrorLog();
    
    // Mock request object
    mockReq = {
      method: 'GET',
      path: '/api/test',
      query: { foo: 'bar' },
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer secret-token',
      },
    };
    
    // Mock response object
    statusCode = 500;
    jsonData = null;
    mockRes = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockRes as Response;
      }),
      json: vi.fn((data: any) => {
        jsonData = data;
        return mockRes as Response;
      }),
    } as unknown as Response;
    
    // Mock next function
    mockNext = vi.fn();
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      fs.rmSync(path.join(os.tmpdir(), 'error-logger-tests'), { recursive: true, force: true });
    } catch {}
    
    delete process.env.NODE_ENV;
  });

  describe('errorLogMiddleware', () => {
    it('should log error with stack trace to error.log', () => {
      const error = new Error('Test error message');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs.length).toBe(1);
      expect(logs[0].type).toBe('error');
      expect(logs[0].error.message).toBe('Test error message');
      expect(logs[0].error.stack).toBeDefined();
    });

    it('should include request context in error log', () => {
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].request.method).toBe('GET');
      expect(logs[0].request.path).toBe('/api/test');
      expect(logs[0].request.query).toEqual({ foo: 'bar' });
    });

    it('should include correlation ID when present on request', () => {
      const correlationId = 'test-correlation-id-123';
      (mockReq as Request & { correlationId?: string }).correlationId = correlationId;
      
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].correlationId).toBe(correlationId);
    });

    it('should include null correlation ID when not present', () => {
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].correlationId).toBeNull();
    });

    it('should include response status code in log', () => {
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].response?.statusCode).toBe(500);
    });

    it('should use error statusCode when available', () => {
      const error = new Error('Not Found') as Error & { statusCode: number };
      error.statusCode = 404;
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusCode).toBe(404);
      const logs = readErrorLog();
      expect(logs[0].response?.statusCode).toBe(404);
    });

    it('should use error status when available', () => {
      const error = new Error('Forbidden') as Error & { status: number };
      error.status = 403;
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusCode).toBe(403);
      const logs = readErrorLog();
      expect(logs[0].response?.statusCode).toBe(403);
    });

    it('should sanitize authorization header in request log', () => {
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].request.headers['authorization']).toBe('[REDACTED]');
    });

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should include error name in log', () => {
      const error = new Error('Test error');
      error.name = 'CustomError';
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs[0].error.name).toBe('CustomError');
    });
  });

  describe('response behavior', () => {
    it('should return detailed error in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error message');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusCode).toBe(500);
      expect(jsonData).toHaveProperty('error', 'Detailed error message');
      expect(jsonData).toHaveProperty('name', 'Error');
    });

    it('should return generic error in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Detailed error message');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusCode).toBe(500);
      expect(jsonData).toEqual({ error: 'Internal server error' });
      expect(jsonData).not.toHaveProperty('stack');
      expect(jsonData).not.toHaveProperty('message');
    });

    it('should not log to file in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readErrorLog();
      expect(logs.length).toBe(0);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear the error log file', () => {
      const error = new Error('Test error');
      errorLogMiddleware(error, mockReq as Request, mockRes as Response, mockNext);
      
      let logs = readErrorLog();
      expect(logs.length).toBe(1);
      
      clearErrorLog();
      
      logs = readErrorLog();
      expect(logs.length).toBe(0);
    });
  });
});
