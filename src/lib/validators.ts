/**
 * Profile validation utilities
 */

import type { ProfileFormData, ValidationErrors } from '../shared/types';

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 50;

export function validateProfile(data: Partial<ProfileFormData>): ValidationErrors {
  const errors: ValidationErrors = {};

  // Name validation
  if (!data.name) {
    errors.name = 'Name is required';
  } else if (data.name.trim().length < MIN_NAME_LENGTH) {
    errors.name = 'Name is required';
  } else if (data.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be less than ${MAX_NAME_LENGTH} characters`;
  }

  return errors;
}

export function isValidProfile(data: ProfileFormData): boolean {
  const errors = validateProfile(data);
  return Object.keys(errors).length === 0;
}

export function sanitizeProfile(data: ProfileFormData): ProfileFormData {
  return {
    name: data.name.trim(),
    bio: data.bio?.trim() ?? '',
  };
}
