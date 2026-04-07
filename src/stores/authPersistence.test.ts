/**
 * Integration tests for auth and profile persistence
 * Tests the full flow of logout/login and profile persistence
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { authAPI } from '../lib/authApi';
import { profileAPI } from '../lib/api';
import { getAuthToken, clearAuthToken } from '../lib/auth';

// Mock the auth API client
vi.mock('../lib/authApi', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    verify: vi.fn(),
  },
}));

// Mock the profile API client
vi.mock('../lib/api', () => ({
  profileAPI: {
    fetchProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
  },
}));

// Mock the auth token utilities
vi.mock('../lib/auth', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

describe('authPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores to initial state
    useAuthStore.setState({
      isAuthenticated: false,
      currentUser: null,
      authToken: null,
      isLoading: false,
      error: null,
    });
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

  describe('After logout, profileStore should still have profile data', () => {
    it('logout preserves profile data in profileStore', async () => {
      // Setup: User is logged in with a profile
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      // Perform logout
      await useAuthStore.getState().logout();

      // Verify authStore was cleared
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().currentUser).toBeNull();
      expect(useAuthStore.getState().authToken).toBeNull();

      // Verify profileStore still has the profile data
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');
    });

    it('profile data persists across logout/login cycle', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Persistent User',
        bio: 'This profile should persist',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // User logs in
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });

      // Profile is loaded
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      // User logs out
      await useAuthStore.getState().logout();

      // Profile should still be there
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');

      // Simulate re-login
      const newToken = 'new-valid-token';
      const newUser = { id: 'user-1', username: 'testuser' };

      vi.mocked(getAuthToken).mockReturnValue(newToken);
      vi.mocked(authAPI.verify).mockResolvedValue(newUser);
      vi.mocked(profileAPI.fetchProfile).mockResolvedValue(mockProfile);

      // User loads token (simulating app restart / re-login)
      await useAuthStore.getState().loadToken();

      // User loads profile
      await useProfileStore.getState().loadProfile();

      // Both auth and profile should be restored
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().currentUser).toEqual(newUser);
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');
    });
  });

  describe('After re-login, profile should be re-loaded', () => {
    it('loadProfile fetches profile from API after re-login', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Reloaded User',
        bio: 'Profile reloaded after login',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Setup: User logs in fresh (no profile in store)
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });

      vi.mocked(profileAPI.fetchProfile).mockResolvedValue(mockProfile);

      // Load profile
      await useProfileStore.getState().loadProfile();

      // Verify profile was fetched
      expect(profileAPI.fetchProfile).toHaveBeenCalled();
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');
    });

    it('profile is null when user has no profile on backend', async () => {
      // Setup: User logs in
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });

      vi.mocked(profileAPI.fetchProfile).mockResolvedValue(null);

      // Load profile
      await useProfileStore.getState().loadProfile();

      // Verify profile is null and status is not_found
      expect(useProfileStore.getState().profile).toBeNull();
      expect(useProfileStore.getState().status).toBe('not_found');
    });
  });

  describe('Verify that logout only clears authStore, not profileStore', () => {
    it('logout clears auth state but preserves profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Preserved User',
        bio: 'Should not be cleared',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Setup authenticated state with profile
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      // Perform logout
      await useAuthStore.getState().logout();

      // authStore should be cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.currentUser).toBeNull();
      expect(authState.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();

      // profileStore should NOT be cleared
      const profileState = useProfileStore.getState();
      expect(profileState.profile).toEqual(mockProfile);
      expect(profileState.status).toBe('loaded');
      expect(profileState.isEditing).toBe(false);
    });

    it('logout does not call any profile API methods', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      // Verify no profile API methods were called
      expect(profileAPI.fetchProfile).not.toHaveBeenCalled();
      expect(profileAPI.createProfile).not.toHaveBeenCalled();
      expect(profileAPI.updateProfile).not.toHaveBeenCalled();
      expect(profileAPI.deleteProfile).not.toHaveBeenCalled();
    });

    it('logout preserves profile even if API logout fails', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
      });
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockRejectedValue(new Error('Server error'));

      await useAuthStore.getState().logout();

      // Even though API logout failed, auth should be cleared
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // But profile should still be preserved
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');
    });
  });

  describe('Full logout/login flow with profile', () => {
    it('complete flow: login -> create profile -> logout -> login -> profile exists', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Full Flow User',
        bio: 'Testing full flow',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Step 1: User logs in
      const loginResponse = { user: { id: 'user-1', username: 'testuser' }, token: 'token-1' };
      vi.mocked(authAPI.login).mockResolvedValue(loginResponse);
      await useAuthStore.getState().login('testuser', 'password123');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Step 2: User creates profile
      vi.mocked(profileAPI.createProfile).mockResolvedValue(mockProfile);
      await useProfileStore.getState().saveProfile({ name: 'Full Flow User', bio: 'Testing full flow' });

      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');

      // Step 3: User logs out
      vi.mocked(authAPI.logout).mockResolvedValue(undefined);
      await useAuthStore.getState().logout();

      // Auth should be cleared but profile preserved
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useProfileStore.getState().profile).toEqual(mockProfile);

      // Step 4: User logs back in (simulating app restart with valid token)
      vi.mocked(getAuthToken).mockReturnValue('token-1');
      vi.mocked(authAPI.verify).mockResolvedValue(loginResponse.user);
      vi.mocked(profileAPI.fetchProfile).mockResolvedValue(mockProfile);

      await useAuthStore.getState().loadToken();
      await useProfileStore.getState().loadProfile();

      // Profile should be re-loaded
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
      expect(useProfileStore.getState().status).toBe('loaded');
    });
  });
});
