/**
 * Tests for authApi
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authAPI } from './authApi';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock the auth module's token functions to use our mock localStorage
vi.mock('./auth', () => ({
  getAuthToken: vi.fn(() => localStorageMock.getItem('openmarcus-auth-token')),
  setAuthToken: vi.fn((token: string) => localStorageMock.setItem('openmarcus-auth-token', token)),
  clearAuthToken: vi.fn(() => localStorageMock.removeItem('openmarcus-auth-token')),
  getAuthHeader: vi.fn(() => {
    const token = localStorageMock.getItem('openmarcus-auth-token');
    return token ? `Bearer ${token}` : null;
  }),
}));

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should call POST /api/auth/login with credentials', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: 'user-1', username: 'testuser' },
          token: 'test-token-123',
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await authAPI.login({ username: 'testuser', password: 'password123' });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });
    });

    it('should store token in localStorage on successful login', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: 'user-1', username: 'testuser' },
          token: 'test-token-123',
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authAPI.login({ username: 'testuser', password: 'password123' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('openmarcus-auth-token', 'test-token-123');
      expect(result).toEqual({
        user: { id: 'user-1', username: 'testuser' },
        token: 'test-token-123',
      });
    });

    it('should throw error on failed login', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Invalid username or password' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        authAPI.login({ username: 'testuser', password: 'wrongpassword' })
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw error from response when JSON parsing fails', async () => {
      // When json() itself throws (network error, not HTTP error),
      // the catch returns a generic error object, then we throw with that message
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        authAPI.login({ username: 'testuser', password: 'password' })
      ).rejects.toThrow('Server error');
    });
  });

  describe('register', () => {
    it('should call POST /api/auth/register with credentials', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: 'user-2', username: 'newuser' },
          token: 'new-token-456',
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await authAPI.register({ username: 'newuser', password: 'securepassword' });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser', password: 'securepassword' }),
      });
    });

    it('should store token in localStorage on successful registration', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: 'user-2', username: 'newuser' },
          token: 'new-token-456',
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authAPI.register({ username: 'newuser', password: 'securepassword' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('openmarcus-auth-token', 'new-token-456');
      expect(result).toEqual({
        user: { id: 'user-2', username: 'newuser' },
        token: 'new-token-456',
      });
    });

    it('should throw error on duplicate username', async () => {
      const mockResponse = {
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({ error: 'Username already exists' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        authAPI.register({ username: 'existinguser', password: 'password' })
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('logout', () => {
    it('should call POST /api/auth/logout with auth header', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await authAPI.logout();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });
    });

    it('should clear token from localStorage on successful logout', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await authAPI.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('openmarcus-auth-token');
    });

    it('should clear localStorage even when fetch fails', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Invalid or expired token' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Logout throws when server returns error, but still clears localStorage
      await expect(authAPI.logout()).rejects.toThrow('Invalid or expired token');
      
      // Token should still be cleared from localStorage (in finally block)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('openmarcus-auth-token');
    });

    it('should not call fetch if no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await authAPI.logout();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('openmarcus-auth-token');
    });
  });

  describe('verify', () => {
    it('should call GET /api/auth/verify with auth header', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: { id: 'user-1', username: 'testuser' },
          valid: true,
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await authAPI.verify();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });
      expect(result).toEqual({ id: 'user-1', username: 'testuser' });
    });

    it('should throw error when no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      await expect(authAPI.verify()).rejects.toThrow('No auth token found');
    });

    it('should clear token on invalid response', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      const mockResponse = {
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Invalid or expired token' }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(authAPI.verify()).rejects.toThrow('Invalid or expired token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('openmarcus-auth-token');
    });
  });
});
