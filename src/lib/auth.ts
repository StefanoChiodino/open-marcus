/**
 * Authentication utilities
 * 
 * Manages user authentication token storage in localStorage.
 * Tokens are stored under the key 'openmarcus-auth-token'.
 */

/** localStorage key for auth token */
const AUTH_TOKEN_KEY = 'openmarcus-auth-token';

/**
 * Get the stored auth token from localStorage
 * @returns The auth token string or null if not found
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the auth token in localStorage
 * @param token - The token string to store
 */
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // localStorage might be unavailable (e.g., private mode)
    // Silently ignore
  }
}

/**
 * Clear the stored auth token from localStorage
 */
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Get the Authorization header value for API requests
 * @returns The header value in 'Bearer {token}' format or null if no token
 */
export function getAuthHeader(): string | null {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}
