/**
 * Tests for authStore
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { authAPI } from '../lib/authApi';
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

// Mock the auth token utilities
vi.mock('../lib/auth', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state before each test
    useAuthStore.setState({
      isAuthenticated: false,
      currentUser: null,
      authToken: null,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadToken', () => {
    it('should set isAuthenticated to false when no token exists', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);

      await useAuthStore.getState().loadToken();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
    });

    it('should verify token and set user when token exists', async () => {
      const mockToken = 'valid-token';
      const mockUser = { id: 'user-1', username: 'testuser' };
      vi.mocked(getAuthToken).mockReturnValue(mockToken);
      vi.mocked(authAPI.verify).mockResolvedValue(mockUser);

      await useAuthStore.getState().loadToken();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toEqual(mockUser);
      expect(state.authToken).toBe(mockToken);
    });

    it('should clear token when verification fails', async () => {
      const mockToken = 'invalid-token';
      vi.mocked(getAuthToken).mockReturnValue(mockToken);
      vi.mocked(authAPI.verify).mockRejectedValue(new Error('Invalid token'));

      await useAuthStore.getState().loadToken();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should set authenticated state on successful login', async () => {
      const mockUser = { id: 'user-1', username: 'testuser' };
      const mockToken = 'new-token';
      vi.mocked(authAPI.login).mockResolvedValue({ user: mockUser, token: mockToken });

      await useAuthStore.getState().login('testuser', 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toEqual(mockUser);
      expect(state.authToken).toBe(mockToken);
      expect(state.error).toBeNull();
    });

    it('should set error and throw on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      vi.mocked(authAPI.login).mockRejectedValue(new Error(errorMessage));

      await expect(
        useAuthStore.getState().login('testuser', 'wrongpassword')
      ).rejects.toThrow(errorMessage);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('logout', () => {
    it('should clear state on logout', async () => {
      const mockToken = 'valid-token';
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: mockToken,
      });
      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();
    });

    it('should clear state even if API logout fails', async () => {
      const mockToken = 'valid-token';
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: mockToken,
      });
      vi.mocked(authAPI.logout).mockRejectedValue(new Error('Server error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();
    });

    it('should handle logout when not authenticated', async () => {
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('should do nothing when no token exists', async () => {
      useAuthStore.setState({ authToken: null });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(authAPI.verify).not.toHaveBeenCalled();
    });

    it('should update state when token is valid', async () => {
      const mockToken = 'valid-token';
      const mockUser = { id: 'user-1', username: 'testuser' };
      useAuthStore.setState({ authToken: mockToken });
      vi.mocked(authAPI.verify).mockResolvedValue(mockUser);

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toEqual(mockUser);
    });

    it('should clear state when token is invalid', async () => {
      const mockToken = 'invalid-token';
      useAuthStore.setState({ authToken: mockToken });
      vi.mocked(authAPI.verify).mockRejectedValue(new Error('Invalid token'));

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(state.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('getAuthHeaders', () => {
    it('should return empty object when not authenticated', () => {
      useAuthStore.setState({ authToken: null });

      const headers = useAuthStore.getState().getAuthHeaders();

      expect(headers).toEqual({});
    });

    it('should return Authorization header when authenticated', () => {
      const mockToken = 'valid-token';
      useAuthStore.setState({ authToken: mockToken });

      const headers = useAuthStore.getState().getAuthHeaders();

      expect(headers).toEqual({
        Authorization: `Bearer ${mockToken}`,
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('logout and profileStore interaction', () => {
    it('logout does NOT clear profileStore - only clears authStore', async () => {
      // Set up authStore with authenticated state
      const mockToken = 'valid-token';
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: mockToken,
      });

      // Set up profileStore with existing profile
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: false,
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      // Perform logout
      await useAuthStore.getState().logout();

      // Verify authStore was cleared
      const authState = useAuthStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.currentUser).toBeNull();
      expect(authState.authToken).toBeNull();
      expect(clearAuthToken).toHaveBeenCalled();

      // Verify profileStore was NOT cleared - profile should still exist
      const profileState = useProfileStore.getState();
      expect(profileState.profile).toEqual(mockProfile);
      expect(profileState.status).toBe('loaded');
    });

    it('logout preserves profileStore even when profile is being edited', async () => {
      // Set up authStore with authenticated state
      const mockToken = 'valid-token';
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: mockToken,
      });

      // Set up profileStore with existing profile and editing state
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      useProfileStore.setState({
        profile: mockProfile,
        status: 'loaded',
        isEditing: true, // User was editing when they logged out
      });

      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      // Perform logout
      await useAuthStore.getState().logout();

      // Verify profileStore profile was NOT cleared
      const profileState = useProfileStore.getState();
      expect(profileState.profile).toEqual(mockProfile);
      expect(profileState.status).toBe('loaded');
    });
  });

  describe('isAuthenticated state transitions', () => {
    it('should transition from false to true on successful login', async () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      const mockUser = { id: 'user-1', username: 'testuser' };
      const mockToken = 'new-token';
      vi.mocked(authAPI.login).mockResolvedValue({ user: mockUser, token: mockToken });

      await useAuthStore.getState().login('testuser', 'password123');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should transition from true to false on logout', async () => {
      // First login
      const mockUser = { id: 'user-1', username: 'testuser' };
      const mockToken = 'valid-token';
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: mockUser,
        authToken: mockToken,
      });
      vi.mocked(authAPI.logout).mockResolvedValue(undefined);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should transition from true to false on invalid token during checkAuth', async () => {
      const mockToken = 'invalid-token';
      useAuthStore.setState({ authToken: mockToken });
      vi.mocked(authAPI.verify).mockRejectedValue(new Error('Invalid token'));

      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should transition from false to true on successful loadToken', async () => {
      const mockToken = 'valid-token';
      const mockUser = { id: 'user-1', username: 'testuser' };
      vi.mocked(getAuthToken).mockReturnValue(mockToken);
      vi.mocked(authAPI.verify).mockResolvedValue(mockUser);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      await useAuthStore.getState().loadToken();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should remain false when no token exists on loadToken', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      await useAuthStore.getState().loadToken();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
