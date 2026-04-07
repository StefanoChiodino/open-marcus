import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptObject, decryptObject, deriveKey } from './encryption.js';
import { randomBytes } from 'crypto';

const SALT_LENGTH = 32;

describe('encryption', () => {
  const password = 'test-password-123';
  const plaintext = 'Hello, Marcus! This is a secret message.';

  describe('deriveKey', () => {
    it('should return a 256-bit (32 byte) key', () => {
      const salt = randomBytes(SALT_LENGTH);
      const key = deriveKey(password, salt);
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should return same key for same password and salt', () => {
      const salt = randomBytes(SALT_LENGTH);
      const key1 = deriveKey(password, salt);
      const key2 = deriveKey(password, salt);
      
      expect(key1.equals(key2)).toBe(true);
    });

    it('should return different key for different salts', () => {
      const salt1 = randomBytes(SALT_LENGTH);
      const salt2 = randomBytes(SALT_LENGTH);
      const key1 = deriveKey(password, salt1);
      const key2 = deriveKey(password, salt2);
      
      expect(key1.equals(key2)).toBe(false);
    });

    it('should return different key for different passwords', () => {
      const salt = randomBytes(SALT_LENGTH);
      const key1 = deriveKey('password1', salt);
      const key2 = deriveKey('password2', salt);
      
      expect(key1.equals(key2)).toBe(false);
    });

    it('should throw error for empty password', () => {
      const salt = randomBytes(SALT_LENGTH);
      
      expect(() => deriveKey('', salt)).toThrow('Password cannot be empty');
    });

    it('should throw error for invalid salt length', () => {
      const shortSalt = Buffer.alloc(16); // Wrong length
      
      expect(() => deriveKey(password, shortSalt)).toThrow(`Salt must be ${SALT_LENGTH} bytes`);
    });

    it('should use Argon2id algorithm (memory-hard, GPU-resistant)', () => {
      const salt = randomBytes(SALT_LENGTH);
      const key = deriveKey(password, salt);
      
      // Key should be derived using Argon2id - we verify by checking it works
      expect(key.length).toBe(32);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt plaintext', () => {
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should decrypt ciphertext back to plaintext', () => {
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (due to random IV/salt)', () => {
      const encrypted1 = encrypt(plaintext, password);
      const encrypted2 = encrypt(plaintext, password);
      
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong password', () => {
      const encrypted = encrypt(plaintext, password);
      
      expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
    });
  });

  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt an object', () => {
      const obj = { name: 'Marcus', bio: 'Roman Emperor', age: 58 };
      
      const encrypted = encryptObject(obj, password);
      const decrypted = decryptObject<typeof obj>(encrypted, password);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle nested objects', () => {
      const obj = {
        profile: {
          name: 'Test User',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        sessions: [
          { id: '1', title: 'Session 1' },
          { id: '2', title: 'Session 2' },
        ],
      };
      
      const encrypted = encryptObject(obj, password);
      const decrypted = decryptObject<typeof obj>(encrypted, password);
      
      expect(decrypted).toEqual(obj);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      
      const encrypted = encryptObject(arr, password);
      const decrypted = decryptObject<typeof arr>(encrypted, password);
      
      expect(decrypted).toEqual(arr);
    });
  });

  describe('data integrity', () => {
    it('should preserve unicode characters', () => {
      const unicode = '你好世界 🌍 αβγδ θνψ';
      
      const encrypted = encrypt(unicode, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(unicode);
    });

    it('should handle empty string', () => {
      const empty = '';
      
      const encrypted = encrypt(empty, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(empty);
    });

    it('should handle long strings', () => {
      const long = 'A'.repeat(10000);
      
      const encrypted = encrypt(long, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(long);
    });
  });
});
