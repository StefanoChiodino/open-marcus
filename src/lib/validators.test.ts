import { describe, it, expect } from 'vitest';
import { validateProfile, isValidProfile } from './validators';

describe('Profile Validators', () => {
  describe('validateProfile', () => {
    it('returns error when name is empty', () => {
      const errors = validateProfile({ name: '' });
      expect(errors.name).toBe('Name is required');
    });

    it('returns error when name is undefined', () => {
      const errors = validateProfile({});
      expect(errors.name).toBe('Name is required');
    });

    it('returns error when name is whitespace only', () => {
      const errors = validateProfile({ name: '   ' });
      expect(errors.name).toBe('Name is required');
    });

    it('returns error when name exceeds max length', () => {
      const longName = 'a'.repeat(51);
      const errors = validateProfile({ name: longName });
      expect(errors.name).toBe('Name must be less than 50 characters');
    });

    it('returns no errors for valid name', () => {
      const errors = validateProfile({ name: 'Test User', bio: 'About me' });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('returns no errors for name with minimum length', () => {
      const errors = validateProfile({ name: 'A' });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('allows empty bio', () => {
      const errors = validateProfile({ name: 'Test', bio: '' });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('allows bio without bio validation error', () => {
      const errors = validateProfile({ name: 'Test', bio: 'a'.repeat(500) });
      expect(errors).not.toHaveProperty('bio');
    });
  });

  describe('isValidProfile', () => {
    it('returns false for empty name', () => {
      expect(isValidProfile({ name: '', bio: '' })).toBe(false);
    });

    it('returns true for valid data', () => {
      expect(isValidProfile({ name: 'Test', bio: 'Bio' })).toBe(true);
    });
  });
});
