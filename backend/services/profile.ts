import type { DatabaseService } from '../db/database.js';
import type { Profile } from '../db/schema.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Profile service - handles profile business logic
 */
export class ProfileService {
  private db: DatabaseService | null = null;
  private dbGetter: () => DatabaseService;

  constructor(dbGetter?: () => DatabaseService) {
    this.dbGetter = dbGetter || (() => {
      // ESM-compatible require via createRequire
      const { getDatabase } = require('../db/database.js');
      return getDatabase();
    });
  }

  private getDb(): DatabaseService {
    if (!this.db) {
      this.db = this.dbGetter();
    }
    return this.db;
  }

  /**
   * Create a new profile
   */
  createProfile(name: string, bio: string | null = null): Profile {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }
    
    const trimmedName = name.trim();
    return this.getDb().createProfile(trimmedName, bio);
  }

  /**
   * Create a new profile for a specific user (multi-user mode)
   */
  createProfileForUser(userId: string, name: string, bio: string | null = null): Profile {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }
    
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }
    
    const trimmedName = name.trim();
    return this.getDb().createProfileForUser(userId, trimmedName, bio);
  }

  /**
   * Get the current/only profile
   * Returns the first profile in the system (for single-user app)
   */
  getCurrentProfile(): Profile | null {
    const profiles = this.getDb().listProfiles();
    return profiles.length > 0 ? profiles[0] : null;
  }

  /**
   * Get the current profile for a specific user (multi-user isolation)
   * Returns the first profile for the user
   */
  getCurrentProfileByUserId(userId: string): Profile | null {
    const profiles = this.getDb().listProfilesByUserId(userId);
    return profiles.length > 0 ? profiles[0] : null;
  }

  /**
   * Get profile by ID
   */
  getProfile(id: string): Profile | null {
    return this.getDb().getProfile(id) ?? null;
  }

  /**
   * Update the current/only profile
   */
  updateProfile(id: string, name: string, bio: string | null = null): Profile | null {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required');
    }
    
    const trimmedName = name.trim();
    return this.getDb().updateProfile(id, trimmedName, bio);
  }

  /**
   * Delete the current/only profile
   */
  deleteProfile(id: string): boolean {
    return this.getDb().deleteProfile(id);
  }
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Singleton instance
let profileServiceInstance: ProfileService | null = null;

export function getProfileService(dbGetter?: () => DatabaseService): ProfileService {
  if (!profileServiceInstance) {
    profileServiceInstance = new ProfileService(dbGetter);
  }
  return profileServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetProfileService(): void {
  profileServiceInstance = null;
}

