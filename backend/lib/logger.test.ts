/**
 * Tests for the development logger utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'node:os';

import {
  isProduction,
  getCorrelationId,
  setCorrelationId,
  clearCorrelationId,
  createCorrelationId,
  log,
} from './logger.js';

describe('Logger', () => {
  // Use a unique test directory per test run to avoid state leakage
  const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testBaseDir = path.join(os.tmpdir(), 'logger-tests', testId);
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create unique test directory for this test
    fs.mkdirSync(testBaseDir, { recursive: true });
    process.chdir(testBaseDir);
    
    // Reset environment to development
    process.env.NODE_ENV = 'development';
    clearCorrelationId();
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      fs.rmSync(path.join(os.tmpdir(), 'logger-tests'), { recursive: true, force: true });
    } catch {}
    
    delete process.env.NODE_ENV;
  });

  describe('isProduction', () => {
    it('should return false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('should return false when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;
      expect(isProduction()).toBe(false);
    });

    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('should return true only when NODE_ENV is exactly production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      
      process.env.NODE_ENV = 'prod';
      expect(isProduction()).toBe(false);
      
      process.env.NODE_ENV = 'production mode';
      expect(isProduction()).toBe(false);
    });
  });

  describe('getCorrelationId', () => {
    it('should return a correlation ID', () => {
      const id = getCorrelationId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should return the same ID for subsequent calls', () => {
      const id1 = getCorrelationId();
      const id2 = getCorrelationId();
      expect(id1).toBe(id2);
    });

    it('should return different IDs after clearCorrelationId', () => {
      const id1 = getCorrelationId();
      clearCorrelationId();
      const id2 = getCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('setCorrelationId', () => {
    it('should set a custom correlation ID', () => {
      const customId = 'custom-id-123';
      setCorrelationId(customId);
      expect(getCorrelationId()).toBe(customId);
    });
  });

  describe('createCorrelationId', () => {
    it('should generate a unique ID each time', () => {
      const id1 = createCorrelationId();
      const id2 = createCorrelationId();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid UUID format', () => {
      const id = createCorrelationId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  describe('log directory creation', () => {
    it('should create ./data/logs directory when it does not exist', () => {
      const logDir = path.join(process.cwd(), 'data', 'logs');
      expect(fs.existsSync(logDir)).toBe(false);
      
      // Logging should trigger directory creation
      log.info('trigger directory creation');
      
      expect(fs.existsSync(logDir)).toBe(true);
    });
  });

  describe('log functions', () => {
    it('should not write any logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      log.debug('debug message');
      log.info('info message');
      log.warn('warn message');
      log.error('error message');
      
      // No log files should be created
      const logDir = path.join(process.cwd(), 'data', 'logs');
      expect(fs.existsSync(logDir)).toBe(false);
    });

    it('should write info log to info.log file', () => {
      const message = 'info test message';
      log.info(message);
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      expect(fs.existsSync(infoLogPath)).toBe(true);
      
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);
      
      const entry = JSON.parse(lines[0]);
      expect(entry.level).toBe('info');
      expect(entry.message).toBe(message);
    });

    it('should write debug log to debug.log file', () => {
      log.debug('debug test');
      
      const debugLogPath = path.join(process.cwd(), 'data', 'logs', 'debug.log');
      expect(fs.existsSync(debugLogPath)).toBe(true);
      
      const content = fs.readFileSync(debugLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      expect(entry.level).toBe('debug');
    });

    it('should write warn log to warn.log file', () => {
      log.warn('warn test');
      
      const warnLogPath = path.join(process.cwd(), 'data', 'logs', 'warn.log');
      expect(fs.existsSync(warnLogPath)).toBe(true);
      
      const content = fs.readFileSync(warnLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      expect(entry.level).toBe('warn');
    });

    it('should write error log to error.log file', () => {
      log.error('error test');
      
      const errorLogPath = path.join(process.cwd(), 'data', 'logs', 'error.log');
      expect(fs.existsSync(errorLogPath)).toBe(true);
      
      const content = fs.readFileSync(errorLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      expect(entry.level).toBe('error');
    });

    it('should include context when provided', () => {
      const message = 'test with context';
      const context = { key: 'value', number: 42 };
      log.info(message, context);
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      
      expect(entry.context).toEqual({ key: 'value', number: 42 });
    });

    it('should include correlation ID when set', () => {
      const correlationId = 'test-correlation-id';
      setCorrelationId(correlationId);
      
      log.info('test message');
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      
      expect(entry.correlationId).toBe(correlationId);
    });

    it('should write valid JSON Lines format (one JSON object per line)', () => {
      log.info('first');
      log.info('second');
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBe(2);
      
      for (const line of lines) {
        // Should be valid JSON
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('should have ISO timestamp in log entries', () => {
      log.info('timestamp test');
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());
      
      // Should have ISO timestamp
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should append to existing log file', () => {
      log.info('first message');
      log.info('second message');
      
      const infoLogPath = path.join(process.cwd(), 'data', 'logs', 'info.log');
      const content = fs.readFileSync(infoLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('first message');
      expect(lines[1]).toContain('second message');
    });
  });
});
