/**
 * Tests for password hashing module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { hash, verify } from './password.js';

const TEST_DIR = './data/test-password';

describe('password hashing', () => {
  beforeEach(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test database
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe('hash', () => {
    it('should return an argon2id hash string', async () => {
      const password = 'placeholder-password-1';
      const hashResult = await hash(password);

      // Argon2id hashes start with $argon2id$
      expect(hashResult.startsWith('$argon2id$')).toBe(true);
    });

    it('should return different hashes for same password (random salt)', async () => {
      const password = 'placeholder-password-2';
      const hash1 = await hash(password);
      const hash2 = await hash(password);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(hash('')).rejects.toThrow('Password cannot be empty');
    });

    it('should throw error for null/undefined password', async () => {
      await expect(hash(null as unknown as string)).rejects.toThrow('Password cannot be empty');
      await expect(hash(undefined as unknown as string)).rejects.toThrow('Password cannot be empty');
    });
  });

  describe('verify', () => {
    it('should return true for correct password', async () => {
      const password = 'placeholder-password-3';
      const hashResult = await hash(password);
      const isValid = await verify(hashResult, password);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'placeholder-password-4';
      const wrongPassword = 'wrong-placeholder-5';
      const hashResult = await hash(password);
      const isValid = await verify(hashResult, wrongPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'placeholder-password-6';
      const hashResult = await hash(password);

      const isValid = await verify(hashResult, '');
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await verify('', 'somePassword');
      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await verify('not-a-valid-argon2-hash', 'somePassword');
      expect(isValid).toBe(false);
    });

    it('should return false for tampered hash', async () => {
      const password = 'placeholder-password-7';
      const hashResult = await hash(password);
      const tamperedHash = hashResult.slice(0, -5) + 'XXXXX';
      const isValid = await verify(tamperedHash, password);
      expect(isValid).toBe(false);
    });
  });

  describe('hash format', () => {
    it('should include salt and parameters in hash string', async () => {
      const password = 'placeholder-password-8';
      const hashResult = await hash(password);

      // Argon2id hash format includes version, memory, iterations, parallelism, salt, hash
      // Example: $argon2id$v=19$m=65536,t=3,p=4$SALT$hash
      // Check that hash contains typical argon2id components
      expect(hashResult.startsWith('$argon2id$')).toBe(true);
      expect(hashResult).toContain('$v=19$'); // version
      expect(hashResult).toContain('$m=65536,'); // memory
      expect(hashResult).toContain('t=3');   // iterations (key=value format)
      expect(hashResult).toContain('p=4');   // parallelism
    });

    it('should produce verifiable hash after async hash', async () => {
      const password = 'complex-placeholder-9!@#$%';
      const hashResult = await hash(password);
      const isValid = await verify(hashResult, password);

      expect(isValid).toBe(true);
    });

    it('should work with different password types', async () => {
      const passwords = [
        'simple',
        'P@ssw0rd!',
        'unicode-placeholder-パスワード-🔐',
        'very-long-placeholder-that-is-longer-than-typical-for-testing',
      ];

      for (const password of passwords) {
        const hashResult = await hash(password);
        const isValid = await verify(hashResult, password);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('timing-safe comparison', () => {
    it('should complete verification in reasonable time regardless of password length', async () => {
      const shortPassword = 'short';
      const longPassword = 'this-is-a-very-long-password-that-takes-more-time-to-verify';

      const shortHash = await hash(shortPassword);
      const longHash = await hash(longPassword);

      const start = Date.now();
      await verify(shortHash, shortPassword);
      const shortTime = Date.now() - start;

      const start2 = Date.now();
      await verify(longHash, longPassword);
      const longTime = Date.now() - start2;

      // Both verifications should complete in reasonable time
      // This is a basic check - proper timing attack resistance is handled by argon2 library
      expect(shortTime).toBeLessThan(1000);
      expect(longTime).toBeLessThan(1000);
    });
  });
});
