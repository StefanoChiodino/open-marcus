import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileService, ValidationError, resetProfileService } from './profile.js';
import { DatabaseService } from '../db/database.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('ProfileService', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `profile-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let profileService: ProfileService;

  beforeEach(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    
    // Reset singleton and create service with test db getter
    resetProfileService();
    profileService = new ProfileService(() => db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createProfile', () => {
    it('should create a profile with name and bio', () => {
      const profile = profileService.createProfile('Marcus', 'Roman Emperor');
      
      expect(profile).toBeDefined();
      expect(profile.name).toBe('Marcus');
      expect(profile.bio).toBe('Roman Emperor');
    });

    it('should create a profile with name only', () => {
      const profile = profileService.createProfile('Test User');
      
      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test User');
      expect(profile.bio).toBeNull();
    });

    it('should reject empty name', () => {
      expect(() => profileService.createProfile('')).toThrow(ValidationError);
      expect(() => profileService.createProfile('')).toThrow('Name is required');
    });

    it('should reject whitespace-only name', () => {
      expect(() => profileService.createProfile('   ')).toThrow(ValidationError);
      expect(() => profileService.createProfile('   ')).toThrow('Name is required');
    });

    it('should trim whitespace from name', () => {
      const profile = profileService.createProfile('  Seneca  ');
      
      expect(profile.name).toBe('Seneca');
    });
  });

  describe('getCurrentProfile', () => {
    it('should return null when no profiles exist', () => {
      const profile = profileService.getCurrentProfile();
      expect(profile).toBeNull();
    });

    it('should return the first profile when profiles exist', () => {
      profileService.createProfile('First User');
      profileService.createProfile('Second User');
      
      const profile = profileService.getCurrentProfile();
      
      expect(profile?.name).toBe('First User');
    });
  });

  describe('getProfile', () => {
    it('should get a profile by ID', () => {
      const created = profileService.createProfile('Test User');
      
      const profile = profileService.getProfile(created.id);
      
      expect(profile).toEqual(created);
    });

    it('should return null for non-existent ID', () => {
      const profile = profileService.getProfile(randomUUID());
      expect(profile).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update a profile', () => {
      const created = profileService.createProfile('Original Name', 'Original Bio');
      
      const updated = profileService.updateProfile(created.id, 'New Name', 'New Bio');
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Name');
      expect(updated?.bio).toBe('New Bio');
    });

    it('should reject empty name when updating', () => {
      const created = profileService.createProfile('Test User');
      
      expect(() => profileService.updateProfile(created.id, '')).toThrow(ValidationError);
    });

    it('should reject whitespace-only name when updating', () => {
      const created = profileService.createProfile('Test User');
      
      expect(() => profileService.updateProfile(created.id, '   ')).toThrow(ValidationError);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile', () => {
      const created = profileService.createProfile('To Delete');
      
      const deleted = profileService.deleteProfile(created.id);
      
      expect(deleted).toBe(true);
      expect(profileService.getProfile(created.id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const deleted = profileService.deleteProfile(randomUUID());
      expect(deleted).toBe(false);
    });
  });
});
