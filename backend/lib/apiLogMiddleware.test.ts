/**
 * Tests for API Request Logging Middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiLogMiddleware, readApiLog, clearApiLog } from './apiLogMiddleware.js';
import { NextFunction, Request, Response } from 'express';

describe('apiLogMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: (() => void) | null = null;

  beforeEach(() => {
    // Save original NODE_ENV
    process.env.NODE_ENV = 'development';
    
    // Clear API log before each test
    clearApiLog();
    
    // Mock request object
    mockReq = {
      method: 'GET',
      path: '/api/test',
      query: { foo: 'bar' },
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer secret-token',
        'cookie': 'session=abc123',
      },
    };
    
    // Mock response object with event emitter behavior
    mockRes = {
      statusCode: 200,
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      }),
    } as unknown as Response & { on: ReturnType<typeof vi.fn> };
    
    // Mock next function
    mockNext = vi.fn();
  });

  afterEach(() => {
    // Clean up finish callback
    finishCallback = null;
  });

  describe('apiLogMiddleware', () => {
    it('should call next() to continue middleware chain', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate a unique correlation ID', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect((mockReq as Request & { correlationId?: string }).correlationId).toBeDefined();
      expect(typeof (mockReq as Request & { correlationId?: string }).correlationId).toBe('string');
      expect((mockReq as Request & { correlationId?: string }).correlationId).toHaveLength(36); // UUID format
    });

    it('should log request entry with method, path, query, and headers', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readApiLog();
      const requestLog = logs.find(log => (log as any).type === 'request');
      
      expect(requestLog).toBeDefined();
      expect((requestLog as any).method).toBe('GET');
      expect((requestLog as any).path).toBe('/api/test');
      expect((requestLog as any).query).toEqual({ foo: 'bar' });
    });

    it('should redact sensitive headers in request log', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readApiLog();
      const requestLog = logs.find(log => (log as any).type === 'request');
      
      expect((requestLog as any).headers['authorization']).toBe('[REDACTED]');
      expect((requestLog as any).headers['cookie']).toBe('[REDACTED]');
      expect((requestLog as any).headers['content-type']).toBe('application/json');
    });

    it('should log response entry when response finishes', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Simulate response finish
      if (finishCallback) {
        finishCallback();
      }
      
      const logs = readApiLog();
      const responseLog = logs.find(log => (log as any).type === 'response');
      
      expect(responseLog).toBeDefined();
      expect((responseLog as any).statusCode).toBe(200);
      expect((responseLog as any).durationMs).toBeDefined();
      expect(typeof (responseLog as any).durationMs).toBe('number');
    });

    it('should link request and response via correlation ID', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      const correlationId = (mockReq as Request & { correlationId?: string }).correlationId;
      
      if (finishCallback) {
        finishCallback();
      }
      
      const logs = readApiLog();
      const requestLog = logs.find(log => (log as any).type === 'request');
      const responseLog = logs.find(log => (log as any).type === 'response');
      
      expect((requestLog as any).correlationId).toBe(correlationId);
      expect((responseLog as any).correlationId).toBe(correlationId);
    });

    it('should include timestamp in ISO format', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      const logs = readApiLog();
      const requestLog = logs.find(log => (log as any).type === 'request');
      
      expect((requestLog as any).timestamp).toBeDefined();
      expect(() => new Date((requestLog as any).timestamp)).not.toThrow();
    });
  });

  describe('production mode', () => {
    it('should skip logging when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      // In production mode, log file should not be created or should be empty
      const logs = readApiLog();
      expect(logs.length).toBe(0);
      
      process.env.NODE_ENV = 'development';
    });
  });

  describe('clearApiLog', () => {
    it('should clear the API log file', () => {
      apiLogMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      let logs = readApiLog();
      expect(logs.length).toBeGreaterThan(0);
      
      clearApiLog();
      
      logs = readApiLog();
      expect(logs.length).toBe(0);
    });
  });
});
