/**
 * API client for profile endpoints
 */

import type { ProfileDTO } from '../shared/types';
import { getAuthHeader } from './auth';

const BASE_URL = '/api/profile';

function authHeaders(): HeadersInit {
  const header = getAuthHeader();
  return header ? { Authorization: header } : {};
}

export class ProfileAPIClient {
  async fetchProfile(): Promise<ProfileDTO | null> {
    const response = await fetch(BASE_URL, {
      headers: authHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    return response.json();
  }

  async createProfile(name: string, bio?: string): Promise<ProfileDTO> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, bio }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to create profile: ${response.status}`);
    }

    return response.json();
  }

  async updateProfile(id: string, name: string, bio?: string): Promise<ProfileDTO> {
    const response = await fetch(BASE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id, name, bio }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to update profile: ${response.status}`);
    }

    return response.json();
  }

  async deleteProfile(id: string): Promise<void> {
    const response = await fetch(BASE_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Failed to delete profile: ${response.status}`);
    }
  }
}

export const profileAPI = new ProfileAPIClient();
