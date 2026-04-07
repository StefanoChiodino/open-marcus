/**
 * Authentication store using Zustand
 * Manages auth state, current user, and authentication status.
 * Token is persisted in localStorage via auth utility functions.
 */

import { create } from 'zustand';
import { authAPI, type AuthUser } from '../lib/authApi';
import { getAuthToken, clearAuthToken } from '../lib/auth';

interface AuthState {
  // State
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  authToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadToken: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Helpers
  getAuthHeaders: () => Record<string, string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  authToken: null,
  isLoading: false,
  error: null,

  /**
   * Load token from localStorage and verify if valid.
   * Called on app initialization to restore auth state.
   */
  loadToken: async () => {
    const token = getAuthToken();
    
    if (!token) {
      set({ isAuthenticated: false, authToken: null, currentUser: null });
      return;
    }

    set({ isLoading: true, error: null, authToken: token });

    try {
      const user = await authAPI.verify();
      set({
        isAuthenticated: true,
        currentUser: user,
        authToken: token,
        isLoading: false,
      });
    } catch {
      // Token is invalid or expired
      clearAuthToken();
      set({
        isAuthenticated: false,
        currentUser: null,
        authToken: null,
        isLoading: false,
        error: null, // Don't show error on initial load
      });
    }
  },

  /**
   * Login with username and password.
   * Sets authenticated state and user info on success.
   */
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authAPI.login({ username, password });
      set({
        isAuthenticated: true,
        currentUser: response.user,
        authToken: response.token,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({
        isAuthenticated: false,
        currentUser: null,
        authToken: null,
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  /**
   * Register a new account with username and password.
   * Sets authenticated state and user info on success.
   */
  register: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authAPI.register({ username, password });
      set({
        isAuthenticated: true,
        currentUser: response.user,
        authToken: response.token,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({
        isAuthenticated: false,
        currentUser: null,
        authToken: null,
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  /**
   * Logout the current user.
   * Clears state and removes token from localStorage.
   */
  logout: async () => {
    const { authToken } = get();
    
    set({ isLoading: true, error: null });

    try {
      // Call the logout API endpoint if we have a token
      if (authToken) {
        await authAPI.logout();
      }
    } catch {
      // Even if API call fails, clear local state
    } finally {
      clearAuthToken();
      set({
        isAuthenticated: false,
        currentUser: null,
        authToken: null,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Verify the current auth token is still valid.
   * Updates state if token is still valid, clears if invalid.
   */
  checkAuth: async () => {
    const { authToken } = get();

    if (!authToken) {
      set({ isAuthenticated: false, currentUser: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const user = await authAPI.verify();
      set({
        isAuthenticated: true,
        currentUser: user,
        isLoading: false,
        error: null,
      });
    } catch {
      clearAuthToken();
      set({
        isAuthenticated: false,
        currentUser: null,
        authToken: null,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Get the Authorization header object for API requests.
   * @returns Record with Authorization header or empty object if not authenticated
   */
  getAuthHeaders: (): Record<string, string> => {
    const { authToken } = get();
    if (!authToken) {
      return {};
    }
    return {
      Authorization: `Bearer ${authToken}`,
    };
  },

  /**
   * Clear any error state
   */
  clearError: () => {
    set({ error: null });
  },
}))
