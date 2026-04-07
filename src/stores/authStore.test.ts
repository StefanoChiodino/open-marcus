/**
 * Tests for authStore
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
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
});
