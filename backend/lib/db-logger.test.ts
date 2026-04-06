/**
 * Tests for the database logging wrapper
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'node:os';

import {
  logQuery,
  logTransaction,
  startQueryTimer,
  parseQueryType,
  extractTableName,
} from './db-logger.js';

describe('db-logger', () => {
  // Use a unique test directory per test run to avoid state leakage
  const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const testBaseDir = path.join(os.tmpdir(), 'db-logger-tests', testId);
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create unique test directory for this test
    fs.mkdirSync(testBaseDir, { recursive: true });
    process.chdir(testBaseDir);
    
    // Reset environment to development
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      fs.rmSync(path.join(os.tmpdir(), 'db-logger-tests'), { recursive: true, force: true });
    } catch {}
    
    delete process.env.NODE_ENV;
  });

  describe('parseQueryType', () => {
    it('should parse SELECT queries', () => {
      expect(parseQueryType('SELECT * FROM profiles')).toBe('SELECT');
      expect(parseQueryType('select * from profiles')).toBe('SELECT');
      expect(parseQueryType('  SELECT id FROM users')).toBe('SELECT');
    });

    it('should parse INSERT queries', () => {
      expect(parseQueryType('INSERT INTO profiles (id, name) VALUES (?, ?)')).toBe('INSERT');
      expect(parseQueryType('insert into messages')).toBe('INSERT');
    });

    it('should parse UPDATE queries', () => {
      expect(parseQueryType('UPDATE profiles SET name = ? WHERE id = ?')).toBe('UPDATE');
      expect(parseQueryType('update sessions')).toBe('UPDATE');
    });

    it('should parse DELETE queries', () => {
      expect(parseQueryType('DELETE FROM profiles WHERE id = ?')).toBe('DELETE');
      expect(parseQueryType('delete from messages')).toBe('DELETE');
    });

    it('should parse CREATE queries', () => {
      expect(parseQueryType('CREATE TABLE test (id TEXT)')).toBe('CREATE');
    });

    it('should parse DROP queries', () => {
      expect(parseQueryType('DROP TABLE test')).toBe('DROP');
    });

    it('should return OTHER for unknown query types', () => {
      expect(parseQueryType('PRAGMA journal_mode=WAL')).toBe('OTHER');
      expect(parseQueryType('BEGIN TRANSACTION')).toBe('OTHER');
    });
  });

  describe('extractTableName', () => {
    it('should extract table from SELECT ... FROM', () => {
      expect(extractTableName('SELECT * FROM profiles').toLowerCase()).toBe('profiles');
      expect(extractTableName('SELECT id FROM sessions WHERE id = ?').toLowerCase()).toBe('sessions');
    });

    it('should extract table from INSERT INTO', () => {
      expect(extractTableName('INSERT INTO profiles (id, name) VALUES (?, ?)').toLowerCase()).toBe('profiles');
      expect(extractTableName('INSERT INTO messages (id, content) VALUES (?, ?)').toLowerCase()).toBe('messages');
    });

    it('should extract table from UPDATE', () => {
      expect(extractTableName('UPDATE profiles SET name = ?').toLowerCase()).toBe('profiles');
      expect(extractTableName('UPDATE sessions SET status = ?').toLowerCase()).toBe('sessions');
    });

    it('should extract table from DELETE FROM', () => {
      expect(extractTableName('DELETE FROM profiles WHERE id = ?').toLowerCase()).toBe('profiles');
      expect(extractTableName('DELETE FROM messages WHERE session_id = ?').toLowerCase()).toBe('messages');
    });

    it('should handle complex queries', () => {
      // COUNT(*) queries still have a FROM clause
      expect(extractTableName('SELECT COUNT(*) FROM profiles').toLowerCase()).toBe('profiles');
    });
  });

  describe('startQueryTimer', () => {
    it('should return a function that returns duration in ms', async () => {
      const getDuration = startQueryTimer();
      
      // Small delay to ensure measurable time
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const duration = getDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('logQuery', () => {
    it('should write query log to db.log file', () => {
      logQuery({
        sql: 'SELECT * FROM profiles WHERE id = ?',
        queryType: 'SELECT',
        table: 'profiles',
        durationMs: 1.5,
        rowsReturned: 1,
      });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      expect(fs.existsSync(dbLogPath)).toBe(true);

      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.type).toBe('db_query');
      expect(entry.queryType).toBe('SELECT');
      expect(entry.table).toBe('profiles');
      expect(entry.durationMs).toBe(1.5);
      expect(entry.rowsReturned).toBe(1);
      expect(entry.sql).toBe('SELECT * FROM profiles WHERE id = ?');
    });

    it('should include error in query log when provided', () => {
      logQuery({
        sql: 'SELECT * FROM profiles WHERE id = ?',
        queryType: 'SELECT',
        table: 'profiles',
        durationMs: 0.5,
        error: 'Connection refused',
      });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.level).toBe('error');
      expect(entry.error).toBe('Connection refused');
    });

    it('should not write in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      logQuery({
        sql: 'SELECT * FROM profiles',
        queryType: 'SELECT',
        table: 'profiles',
        durationMs: 1,
      });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      expect(fs.existsSync(dbLogPath)).toBe(false);
    });

    it('should include timestamp in ISO format', () => {
      logQuery({
        sql: 'SELECT 1',
        queryType: 'SELECT',
        table: 'test',
        durationMs: 1,
      });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should append to existing log file', () => {
      logQuery({
        sql: 'SELECT 1',
        queryType: 'SELECT',
        table: 'test1',
        durationMs: 1,
      });

      logQuery({
        sql: 'SELECT 2',
        queryType: 'SELECT',
        table: 'test2',
        durationMs: 2,
      });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('test1');
      expect(lines[1]).toContain('test2');
    });
  });

  describe('logTransaction', () => {
    it('should write transaction log to db.log file', () => {
      logTransaction({ action: 'begin' });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      expect(fs.existsSync(dbLogPath)).toBe(true);

      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.type).toBe('db_transaction');
      expect(entry.action).toBe('begin');
    });

    it('should include duration when provided', () => {
      logTransaction({ action: 'commit', durationMs: 15.5 });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.durationMs).toBe(15.5);
    });

    it('should log rollback action', () => {
      logTransaction({ action: 'rollback' });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('rollback');
    });

    it('should include error for failed transactions', () => {
      logTransaction({ action: 'commit', error: 'Deadlock detected' });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      const content = fs.readFileSync(dbLogPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.level).toBe('error');
      expect(entry.error).toBe('Deadlock detected');
    });

    it('should not write in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      logTransaction({ action: 'begin' });

      const dbLogPath = path.join(process.cwd(), 'data', 'logs', 'db.log');
      expect(fs.existsSync(dbLogPath)).toBe(false);
    });
  });
});
