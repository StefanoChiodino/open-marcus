/**
 * Tests for profileStore
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProfileStore } from '../stores/profileStore';
import { profileAPI } from '../lib/api';

// Mock the API client
vi.mock('../lib/api', () => ({
  profileAPI: {
    fetchProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
  },
}));

describe('profileStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state before each test
    useProfileStore.setState({
      profile: null,
      status: 'loading',
      error: null,
      isEditing: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearProfile', () => {
    it('should call profileAPI.deleteProfile with the profile id', async () => {
      const existingProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({ profile: existingProfile, status: 'loaded' });

      const store = useProfileStore.getState();
      await store.clearProfile();

      expect(profileAPI.deleteProfile).toHaveBeenCalledWith('profile-1');
    });

    it('should clear local state after successful delete', async () => {
      const existingProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({ profile: existingProfile, status: 'loaded' });

      const store = useProfileStore.getState();
      await store.clearProfile();

      const state = useProfileStore.getState();
      expect(state.profile).toBeNull();
      expect(state.status).toBe('not_found');
    });

    it('should clear local state even if delete fails', async () => {
      const existingProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({ profile: existingProfile, status: 'loaded' });
      vi.mocked(profileAPI.deleteProfile).mockRejectedValue(new Error('Server error'));

      const store = useProfileStore.getState();
      await store.clearProfile();

      const state = useProfileStore.getState();
      expect(state.profile).toBeNull();
      expect(state.status).toBe('not_found');
    });
  });

  describe('saveProfile error handling', () => {
    it('sets status to "error" when profile creation fails', async () => {
      const errorMsg = 'Network error';
      vi.mocked(profileAPI.createProfile).mockRejectedValue(new Error(errorMsg));

      const store = useProfileStore.getState();
      await store.saveProfile({ name: 'Test User', bio: 'Test bio' });

      const state = useProfileStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe(errorMsg);
      expect(state.isEditing).toBe(false);
    });

    it('sets status to "error" when profile update fails', async () => {
      const existingProfile = {
        id: 'profile-1',
        name: 'Existing User',
        bio: 'Existing bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({ profile: existingProfile, status: 'loaded' });

      const errorMsg = 'Server error';
      vi.mocked(profileAPI.updateProfile).mockRejectedValue(new Error(errorMsg));

      const store = useProfileStore.getState();
      await store.saveProfile({ name: 'Updated User', bio: 'Updated bio' });

      const state = useProfileStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe(errorMsg);
      expect(state.isEditing).toBe(false);
    });

    it('sets a generic error message when error is not an Error instance', async () => {
      vi.mocked(profileAPI.createProfile).mockRejectedValue('String error');

      const store = useProfileStore.getState();
      await store.saveProfile({ name: 'Test User', bio: '' });

      const state = useProfileStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Failed to save profile');
      expect(state.isEditing).toBe(false);
    });
  });
});
