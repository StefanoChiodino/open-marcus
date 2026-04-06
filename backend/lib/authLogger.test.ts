/**
 * Tests for the auth logger utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import {
  logAuthEvent,
  logLoginSuccess,
  logLoginFailure,
  logLogout,
  logSessionCreated,
  logAuthError,
  readAuthLog,
  clearAuthLog,
} from './authLogger.js';

describe('AuthLogger', () => {
  // Use a unique test directory per test run to avoid state leakage
  const testId = `auth-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testBaseDir = path.join(os.tmpdir(), 'auth-logger-tests', testId);
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create unique test directory for this test
    fs.mkdirSync(testBaseDir, { recursive: true });
    process.chdir(testBaseDir);
    
    // Set environment to development
    process.env.NODE_ENV = 'development';
    
    // Clear any existing log
    clearAuthLog();
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      fs.rmSync(path.join(os.tmpdir(), 'auth-logger-tests'), { recursive: true, force: true });
    } catch {}
    
    delete process.env.NODE_ENV;
  });

  describe('logAuthEvent', () => {
    it('should not write logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      logAuthEvent('login_success', { profileId: 'test-profile' });
      
      const logPath = path.join(process.cwd(), 'data', 'logs', 'auth.log');
      expect(fs.existsSync(logPath)).toBe(false);
    });

    it('should write auth event to auth.log file', () => {
      logAuthEvent('login_success', { profileId: 'profile-123' });
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('login_success');
      expect(entries[0].profileId).toBe('profile-123');
    });

    it('should include ISO timestamp', () => {
      logAuthEvent('logout', { profileId: 'profile-123' });
      
      const entries = readAuthLog();
      expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should include correlation ID when provided', () => {
      logAuthEvent('login_failure', { reason: 'bad password', correlationId: 'corr-123' });
      
      const entries = readAuthLog();
      expect(entries[0].correlationId).toBe('corr-123');
    });
  });

  describe('logLoginSuccess', () => {
    it('should log login success event with profile ID', () => {
      logLoginSuccess('profile-abc');
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('login_success');
      expect(entries[0].profileId).toBe('profile-abc');
    });
  });

  describe('logLoginFailure', () => {
    it('should log login failure event with reason', () => {
      logLoginFailure('Invalid password');
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('login_failure');
      expect(entries[0].reason).toBe('Invalid password');
    });
  });

  describe('logLogout', () => {
    it('should log logout event with profile ID', () => {
      logLogout('profile-xyz');
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('logout');
      expect(entries[0].profileId).toBe('profile-xyz');
    });
  });

  describe('logSessionCreated', () => {
    it('should log session created event with session ID and profile ID', () => {
      logSessionCreated('session-123', 'profile-456');
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('session_created');
      expect(entries[0].sessionId).toBe('session-123');
      expect(entries[0].profileId).toBe('profile-456');
    });
  });

  describe('logAuthError', () => {
    it('should log auth error with error message and stack trace', () => {
      const error = new Error('Database connection failed');
      logAuthError(error);
      
      const entries = readAuthLog();
      expect(entries.length).toBe(1);
      expect(entries[0].event).toBe('auth_error');
      expect(entries[0].error).toBe('Database connection failed');
      expect(entries[0].stack).toContain('Database connection failed');
    });
  });

  describe('readAuthLog', () => {
    it('should return empty array when log file does not exist', () => {
      const entries = readAuthLog();
      expect(entries).toEqual([]);
    });

    it('should read multiple log entries', () => {
      logLoginSuccess('profile-1');
      logLoginFailure('Invalid credentials');
      logLogout('profile-1');
      
      const entries = readAuthLog();
      expect(entries.length).toBe(3);
      expect(entries[0].event).toBe('login_success');
      expect(entries[1].event).toBe('login_failure');
      expect(entries[2].event).toBe('logout');
    });
  });

  describe('clearAuthLog', () => {
    it('should delete the auth log file', () => {
      logLoginSuccess('profile-123');
      expect(fs.existsSync(path.join(process.cwd(), 'data', 'logs', 'auth.log'))).toBe(true);
      
      clearAuthLog();
      
      expect(fs.existsSync(path.join(process.cwd(), 'data', 'logs', 'auth.log'))).toBe(false);
    });

    it('should not throw when log file does not exist', () => {
      expect(() => clearAuthLog()).not.toThrow();
    });
  });

  describe('security - no sensitive data in logs', () => {
    it('should not include password in login failure log', () => {
      // Even though password is passed to the function conceptually, 
      // our implementation only logs the reason, not the password
      logLoginFailure('Invalid credentials');
      
      const entries = readAuthLog();
      const logContent = JSON.stringify(entries);
      expect(logContent).not.toContain('password');
      expect(logContent).not.toContain('secret');
    });

    it('should not include password hash in any log', () => {
      logLoginSuccess('profile-123');
      
      const entries = readAuthLog();
      const logContent = JSON.stringify(entries);
      expect(logContent).not.toContain('password_hash');
      expect(logContent).not.toContain('argon2');
    });
  });
});
