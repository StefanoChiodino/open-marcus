import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from './database.js';
import { decryptObject, EncryptedData } from '../crypto/encryption.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Encryption-at-rest verification tests for VAL-PROFILE-005:
 * "Profile data stored in database is encrypted and not readable as plaintext."
 * 
 * Verification steps:
 * 1. Query database directly for profile
 * 2. Verify data is not plaintext
 * 3. Verify decryption produces correct plaintext
 */
describe('Encryption at Rest - Profile Data (VAL-PROFILE-005)', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `encryption-verification-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-key-for-verification';
  let db: DatabaseService;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Profile data stored as encrypted blob', () => {
    it('should store encrypted_data in the database after profile creation', () => {
      const profile = db.createProfile('Marcus Aurelius', 'Roman Emperor and Stoic philosopher');
      
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      expect(rawEncrypted).toBeDefined();
      expect(rawEncrypted).not.toBeNull();
      expect(typeof rawEncrypted).toBe('string');
    });

    it('should store encrypted_data as a valid JSON string', () => {
      const profile = db.createProfile('Seneca', 'Stoic philosopher and statesman');
      
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      // Should be parseable JSON
      expect(() => JSON.parse(rawEncrypted!)).not.toThrow();
      
      const parsed = JSON.parse(rawEncrypted!);
      
      // Should contain the expected EncryptedData fields
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
      expect(parsed).toHaveProperty('salt');
      expect(parsed).toHaveProperty('ciphertext');
    });

    it('should store encrypted_data as JSON stringified EncryptedData object', () => {
      const profile = db.createProfile('Epictetus', 'Freed slave and Stoic teacher');
      
      const rawEncrypted = db.getRawProfileData(profile.id);
      const parsed: EncryptedData = JSON.parse(rawEncrypted!);
      
      // All fields should be base64 strings
      expect(typeof parsed.iv).toBe('string');
      expect(typeof parsed.authTag).toBe('string');
      expect(typeof parsed.salt).toBe('string');
      expect(typeof parsed.ciphertext).toBe('string');
      
      // All values should be valid base64
      expect(() => Buffer.from(parsed.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(parsed.authTag, 'base64')).not.toThrow();
      expect(() => Buffer.from(parsed.salt, 'base64')).not.toThrow();
      expect(() => Buffer.from(parsed.ciphertext, 'base64')).not.toThrow();
    });
  });

  describe('Raw database query shows encrypted data (not plaintext)', () => {
    it('should not contain plaintext name in the encrypted_data field', () => {
      const secretName = 'SecretUser' + randomUUID().replace(/-/g, '');
      db.createProfile(secretName, 'Some bio');
      
      const rawEncrypted = db.getRawProfileData(
        db.listProfiles()[0].id,
      );
      
      // The raw encrypted_data should NOT contain the plaintext name
      expect(rawEncrypted).not.toContain(secretName);
    });

    it('should not contain plaintext bio in the encrypted_data field', () => {
      const secretBio = 'This is a very specific secret bio that should not appear in plaintext';
      db.createProfile('Test User', secretBio);
      
      const rawEncrypted = db.getRawProfileData(
        db.listProfiles()[0].id,
      );
      
      // The raw encrypted_data should NOT contain the plaintext bio
      expect(rawEncrypted).not.toContain(secretBio);
    });

    it('should produce different encrypted_data for profiles with same name (random IV/salt)', () => {
      db.createProfile('Same Name', 'Bio 1');
      db.createProfile('Same Name', 'Bio 2');
      
      const profiles = db.listProfiles();
      const raw1 = db.getRawProfileData(profiles[0].id);
      const raw2 = db.getRawProfileData(profiles[1].id);
      
      expect(raw1).not.toBe(raw2);
    });

    it('should not contain recognizable JSON structure of the original data', () => {
      const profile = db.createProfile('Marcus Aurelius', 'Roman Emperor');
      
      const rawEncrypted = db.getRawProfileData(profile.id);
      const parsed = JSON.parse(rawEncrypted!);
      
      // The ciphertext should not be the original JSON structure
      // Original would look like: {"name":"Marcus Aurelius","bio":"Roman Emperor"}
      expect(parsed.ciphertext).not.toContain('Marcus Aurelius');
      expect(parsed.ciphertext).not.toContain('Roman Emperor');
      expect(parsed.ciphertext).not.toContain('"name"');
      expect(parsed.ciphertext).not.toContain('"bio"');
    });
  });

  describe('Decryption produces correct plaintext', () => {
    it('should decrypt to original profile data with correct key', () => {
      const originalName = 'Marcus Aurelius';
      const originalBio = 'Roman Emperor and Stoic philosopher';
      
      const profile = db.createProfile(originalName, originalBio);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.name).toBe(originalName);
      expect(decrypted.bio).toBe(originalBio);
    });

    it('should decrypt profile with null bio correctly', () => {
      const originalName = 'Seneca';
      
      const profile = db.createProfile(originalName, null);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.name).toBe(originalName);
      expect(decrypted.bio).toBeNull();
    });

    it('should decrypt to original data after profile update', () => {
      const profile = db.createProfile('Original Name', 'Original Bio');
      
      db.updateProfile(profile.id, 'Updated Name', 'Updated Bio');
      
      const refreshed = db.getProfile(profile.id);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.name).toBe('Updated Name');
      expect(decrypted.bio).toBe('Updated Bio');
      
      // The decrypted data should also match what the service returns
      expect(decrypted.name).toBe(refreshed?.name);
      expect(decrypted.bio).toBe(refreshed?.bio);
    });

    it('should fail to decrypt with wrong encryption key', () => {
      db.createProfile('Secret User', 'Secret Bio');
      
      const profile = db.listProfiles()[0];
      const rawEncrypted = db.getRawProfileData(profile.id);
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      
      // Wrong key should throw
      expect(() => {
        decryptObject<{ name: string; bio: string | null }>(encrypted, 'wrong-key-entirely');
      }).toThrow();
    });

    it('should verify profile data integrity via verifyProfileData method', () => {
      const profile = db.createProfile('Test User', 'Test Bio');
      
      expect(db.verifyProfileData(profile.id)).toBe(true);
    });

    it('should reject verification with wrong encryption key', () => {
      const profile = db.createProfile('Test User', 'Test Bio');
      
      const wrongKeyDb = new DatabaseService(testDbPath, 'completely-wrong-key');
      
      expect(wrongKeyDb.verifyProfileData(profile.id)).toBe(false);
      
      wrongKeyDb.close();
    });
  });

  describe('Encryption round-trip integrity', () => {
    it('should handle unicode characters in profile data', () => {
      const unicodeName = 'Márcus Àurélius';
      const unicodeBio = '哲學の stoic philosopher — 斯多葛派';
      
      const profile = db.createProfile(unicodeName, unicodeBio);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      // Verify not plaintext
      expect(rawEncrypted).not.toContain(unicodeName);
      expect(rawEncrypted).not.toContain(unicodeBio);
      
      // Verify decryption
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.name).toBe(unicodeName);
      expect(decrypted.bio).toBe(unicodeBio);
    });

    it('should handle very long profile bios', () => {
      const longBio = 'A'.repeat(10000);
      
      const profile = db.createProfile('Long Bio User', longBio);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.bio).toBe(longBio);
    });

    it('should handle empty strings in profile data', () => {
      const profile = db.createProfile('Empty Bio User', '');
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.bio).toBe('');
      expect(decrypted.name).toBe('Empty Bio User');
    });

    it('should handle profile data with special characters', () => {
      const specialName = 'User with "quotes" & <tags>';
      const specialBio = "It's a line\nwith newlines\tand tabs \\and backslashes";
      
      const profile = db.createProfile(specialName, specialBio);
      const rawEncrypted = db.getRawProfileData(profile.id);
      
      // Verify not plaintext
      expect(rawEncrypted).not.toContain(specialName);
      expect(rawEncrypted).not.toContain(specialBio);
      
      // Verify decryption
      const encrypted: EncryptedData = JSON.parse(rawEncrypted!);
      const decrypted = decryptObject<{ name: string; bio: string | null }>(encrypted, encryptionPassword);
      
      expect(decrypted.name).toBe(specialName);
      expect(decrypted.bio).toBe(specialBio);
    });
  });
});
