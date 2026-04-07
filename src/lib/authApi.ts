/**
 * Authentication API client
 * 
 * Provides methods for user authentication:
 * - login(username, password): Authenticate user and store token
 * - register(username, password): Create account and store token
 * - logout(): Invalidate token and clear local storage
 */

import { setAuthToken, clearAuthToken, getAuthToken } from './auth';

const BASE_URL = '/api/auth';

/**
 * User info returned from auth endpoints
 */
export interface AuthUser {
  id: string;
  username: string;
}

/**
 * Successful auth response
 */
export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/**
 * Auth API error response
 */
export interface AuthError {
  error: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  username: string;
  password: string;
}

export class AuthAPIClient {
  /**
   * Login with username and password
   * Stores the auth token in localStorage on success
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Login failed: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    
    // Store the token in localStorage
    setAuthToken(data.token);
    
    return data;
  }

  /**
   * Register a new account with username and password
   * Stores the auth token in localStorage on success
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(error.error || `Registration failed: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    
    // Store the token in localStorage
    setAuthToken(data.token);
    
    return data;
  }

  /**
   * Logout the current user
   * Invalidates the token server-side and clears localStorage
   */
  async logout(): Promise<void> {
    const token = getAuthToken();
    
    // If we have a token, call the logout endpoint
    if (token) {
      try {
        const response = await fetch(`${BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        // Even if the server returns an error (e.g., token already invalid),
        // we still want to clear the local token
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Server error' }));
          throw new Error(error.error || `Logout failed: ${response.status}`);
        }
      } finally {
        // Always clear the local token, even if the server call failed
        clearAuthToken();
      }
    } else {
      // No token to begin with, just ensure localStorage is clear
      clearAuthToken();
    }
  }

  /**
   * Verify the current auth token is still valid
   * Returns the user info if valid, throws if invalid
   */
  async verify(): Promise<AuthUser> {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No auth token found');
    }

    const response = await fetch(`${BASE_URL}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearAuthToken();
      const error = await response.json().catch(() => ({ error: 'Invalid or expired token' }));
      throw new Error(error.error || `Verification failed: ${response.status}`);
    }

    const data = await response.json();
    return data.user;
  }
}

export const authAPI = new AuthAPIClient();
