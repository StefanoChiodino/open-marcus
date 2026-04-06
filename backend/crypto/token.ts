/**
 * Token generation and verification using HMAC-SHA256
 * 
 * This module provides secure session token generation for authentication.
 * Tokens are signed with a secret key and include a timestamp for expiration.
 * 
 * Token format: base64(payload).base64(signature)
 * Where payload = { userId, username, issuedAt, expiresAt }
 */

import { createHmac } from 'crypto';

/**
 * Token signing secret
 * Supports both SERVER_SECRET and TOKEN_SECRET environment variables.
 * SERVER_SECRET takes precedence if both are set.
 */
const TOKEN_SECRET = process.env.SERVER_SECRET || process.env.TOKEN_SECRET || 'development-token-secret-change-in-production';

/**
 * Token expiry duration in milliseconds.
 * Configurable via TOKEN_EXPIRY_HOURS environment variable (default: 24 hours).
 * Example: TOKEN_EXPIRY_HOURS=24 means tokens expire after 24 hours.
 */
const TOKEN_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);
const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

// In-memory token blacklist for invalidated tokens
const tokenBlacklist = new Set<string>();

export interface TokenPayload {
  userId: string;
  username: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Generate a signed session token for a user
 * 
 * @param userId - The user's ID
 * @param username - The user's username
 * @returns A signed token string
 */
export function generateToken(userId: string, username: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_EXPIRY_MS;
  
  const payload: TokenPayload = {
    userId,
    username,
    issuedAt,
    expiresAt,
  };
  
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64');
  
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64');
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a session token
 * 
 * @param token - The token string to verify
 * @returns The decoded payload if valid, null if invalid or expired
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    
    if (!payloadBase64 || !signature) {
      return null;
    }
    
    // Check if token is blacklisted (invalidated by logout)
    if (tokenBlacklist.has(token)) {
      return null;
    }
    
    // Verify signature
    const expectedSignature = createHmac('sha256', TOKEN_SECRET)
      .update(payloadBase64)
      .digest('base64');
    
    // Timing-safe comparison
  if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }
    
    // Decode payload
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload: TokenPayload = JSON.parse(payloadJson);
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  
  return result === 0;
}

/**
 * Blacklist a token (invalidate it for server-side logout)
 * @param token - The token string to invalidate
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}

/**
 * Check if a token is blacklisted
 * @param token - The token string to check
 * @returns true if the token is blacklisted (invalidated), false otherwise
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Clear the token blacklist (for testing purposes)
 * WARNING: This should only be used in tests, never in production
 */
export function clearBlacklist(): void {
  tokenBlacklist.clear();
}
