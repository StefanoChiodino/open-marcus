import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, encryptObject, decryptObject } from './encryption.js';

describe('encryption', () => {
  const password = 'test-password-123';
  const plaintext = 'Hello, Marcus! This is a secret message.';

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
