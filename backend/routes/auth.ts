/**
 * Authentication routes
 * 
 * POST /api/auth/register - Create new user account
 * POST /api/auth/login - Authenticate user
 * GET /api/auth/verify - Verify session token
 * 
 * All auth events are logged to ./data/logs/auth.log in development mode.
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { hash, verify } from '../crypto/password.js';
import { generateToken, verifyToken, blacklistToken } from '../crypto/token.js';
import { logLoginSuccess, logLoginFailure, logLogout, logAuthError } from '../lib/authLogger.js';
import { getCorrelationId } from '../lib/logger.js';
import { getProfileService } from '../services/profile.js';

const router = Router();

/**
 * POST /api/auth/register
 * 
 * Create a new user account.
 * 
 * Request body:
 *   { username: string, password: string }
 * 
 * Response:
 *   - 201: { user: { id, username }, token } on success
 *   - 400: { error: 'Username is required' } if username is empty
 *   - 400: { error: 'Password is required' } if password is empty
 *   - 409: { error: 'Username already exists' } if username is taken
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate username
    if (!username || username.trim().length === 0) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Validate password
    if (!password || password.length === 0) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const db = getDatabase();

    // Check if username already exists
    if (db.usernameExists(username.trim())) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Hash the password
    const passwordHash = await hash(password);

    // Create the user
    const user = db.createUser(username.trim(), passwordHash);

    // Auto-create a default profile for the user
    const profileService = getProfileService();
    profileService.createProfileForUser(user.id, username.trim());

    // Generate session token
    const token = generateToken(user.id, user.username);

    // Return user info and token
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      logAuthError(error, getCorrelationId());
    }
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * 
 * Authenticate a user.
 * 
 * Request body:
 *   { username: string, password: string }
 * 
 * Response:
 *   - 200: { user: { id, username }, token } on success
 *   - 400: { error: 'Username is required' } if username is empty
 *   - 400: { error: 'Password is required' } if password is empty
 *   - 401: { error: 'Invalid username or password' } if credentials are wrong
 */
router.post('/login', async (req: Request, res: Response) => {
  const correlationId = getCorrelationId();
  
  try {
    const { username, password } = req.body;

    // Validate username
    if (!username || username.trim().length === 0) {
      logLoginFailure('Missing username', correlationId);
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    // Validate password
    if (!password || password.length === 0) {
      logLoginFailure('Missing password', correlationId);
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const db = getDatabase();

    // Find user by username
    const user = db.getUserByUsername(username.trim());

    if (!user) {
      logLoginFailure('User not found', correlationId);
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Verify password
    const isValid = await verify(user.password_hash, password);

    if (!isValid) {
      logLoginFailure('Invalid password', correlationId);
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Generate session token
    const token = generateToken(user.id, user.username);
    
    // Log successful login - get profile for this user
    const profiles = db.listProfiles();
    const profile = profiles.find(p => p.user_id === user.id);
    if (profile) {
      logLoginSuccess(profile.id, correlationId);
    }

    // Return user info and token
    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error) {
      logAuthError(error, correlationId);
    }
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/verify
 * 
 * Verify a session token.
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Response:
 *   - 200: { user: { id, username }, valid: true } if token is valid
 *   - 401: { error: 'Invalid or expired token' } if token is invalid or expired
 */
router.get('/verify', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    res.status(200).json({
      user: {
        id: payload.userId,
        username: payload.username,
      },
      valid: true,
    });
  } catch (error) {
    console.error('Error during token verification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * 
 * Logout a user by invalidating their session token.
 * The client should discard the token after a successful logout.
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Response:
 *   - 200: { success: true } on success
 *   - 401: { error: 'Invalid or expired token' } if token is invalid or missing
 */
router.post('/logout', (req: Request, res: Response) => {
  const correlationId = getCorrelationId();
  
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Blacklist the token so it can no longer be used
    blacklistToken(token);

    logLogout(payload.userId, correlationId);

    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      logAuthError(error, correlationId);
    }
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
