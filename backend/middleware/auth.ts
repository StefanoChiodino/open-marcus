/**
 * Authentication Middleware
 * 
 * Protects /api/* routes by validating Bearer tokens.
 * Public routes (/health, /api/auth/*) bypass authentication.
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../crypto/token.js';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * Paths that don't require authentication
 * Note: These paths are relative to where the middleware is mounted.
 * When mounted at /api, the auth routes appear as /auth/*
 */
const PUBLIC_PATHS = [
  '/health',           // Mounted at root, not under /api
  '/auth/register',    // /api/auth/register appears as /auth/register
  '/auth/login',       // /api/auth/login appears as /auth/login
  '/auth/verify',      // /api/auth/verify appears as /auth/verify
  '/auth/logout',      // /api/auth/logout appears as /auth/logout
];

/**
 * Check if a path is public (doesn't require authentication)
 */
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(publicPath => path === publicPath || path.startsWith(publicPath + '/'));
}

/**
 * Authentication middleware
 * 
 * Validates the Authorization: Bearer {token} header and attaches
 * the user info to req.user if valid.
 * 
 * Public paths bypass authentication:
 * - /health
 * - /api/auth/* (register, login, verify, logout)
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip authentication for public paths
  if (isPublicPath(req.path)) {
    next();
    return;
  }

  // Get Authorization header
  const authHeader = req.headers.authorization;

  // No token provided
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  // Must be Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    return;
  }

  // Extract token
  const token = authHeader.slice(7);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  // Verify token
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  // Attach user to request
  req.user = {
    userId: payload.userId,
    username: payload.username,
  };

  next();
}

export default authMiddleware;
