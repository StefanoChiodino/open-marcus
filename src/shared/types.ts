/**
 * Shared types for OpenMarcus frontend and backend
 */

export interface ProfileDTO {
  id: string;
  name: string;
  bio: string | null;
  encrypted_data?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  name: string;
  bio: string;
}

export interface ValidationErrors {
  name?: string;
}

export type ProfileStatus = 'loading' | 'not_found' | 'loaded' | 'error';
