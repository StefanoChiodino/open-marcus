/**
 * Tests for authentication middleware
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { authMiddleware, type AuthenticatedRequest } from './auth.js';
import { generateToken, blacklistToken } from '../crypto/token.js';

describe('authMiddleware', () => {
  function createTestApp(): Express {
    const app = express();
    app.use(express.json());

    // Apply auth middleware to /api/protected
    app.use('/api/protected', authMiddleware);

    // Protected route - returns user info if authenticated
    app.get('/api/protected/user', (req, _res) => {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        _res.status(200).json({ user: authReq.user });
      } else {
        _res.status(401).json({ error: 'No user attached' });
      }
    });

    app.post('/api/protected/action', (req, _res) => {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        _res.status(200).json({ user: authReq.user });
      } else {
        _res.status(401).json({ error: 'No user attached' });
      }
    });

    // Health endpoint (public)
    app.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Auth routes (public)
    app.post('/api/auth/login', (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.post('/api/auth/register', (_req, res) => {
      res.status(201).json({ success: true });
    });
    app.get('/api/auth/verify', (_req, res) => {
      res.status(200).json({ valid: true });
    });

    return app;
  }

  describe('Protected routes without auth header', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const app = createTestApp();
      const response = await request(app).get('/api/protected/user');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: No token provided');
    });
  });

  describe('Protected routes with invalid token', () => {
    it('should return 401 for invalid token format', async () => {
      const app = createTestApp();
      const response = await request(app)
        .get('/api/protected/user')
        .set('Authorization', 'InvalidFormat token123');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: Invalid token format');
    });

    it('should return 401 for malformed token', async () => {
      const app = createTestApp();
      const response = await request(app)
        .get('/api/protected/user')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: Invalid or expired token');
    });

    it('should return 401 for missing token after Bearer', async () => {
      const app = createTestApp();
      // Note: HTTP headers trim trailing whitespace, so "Bearer " becomes "Bearer"
      // which fails the "startsWith('Bearer ')" check
      const response = await request(app)
        .get('/api/protected/user')
        .set('Authorization', 'Bearer');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: Invalid token format');
    });
  });

  describe('Protected routes with valid token', () => {
    it('should return 200 and attach user for valid token', async () => {
      const app = createTestApp();
      const token = generateToken('user-123', 'testuser');

      const response = await request(app)
        .get('/api/protected/user')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        userId: 'user-123',
        username: 'testuser',
      });
    });

    it('should work with POST requests', async () => {
      const app = createTestApp();
      const token = generateToken('user-456', 'anotheruser');

      const response = await request(app)
        .post('/api/protected/action')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        userId: 'user-456',
        username: 'anotheruser',
      });
    });
  });

  describe('Blacklisted tokens', () => {
    it('should return 401 for blacklisted token', async () => {
      const app = createTestApp();
      const token = generateToken('user-789', 'blacklistuser');

      // First, blacklist the token
      blacklistToken(token);

      const response = await request(app)
        .get('/api/protected/user')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized: Invalid or expired token');
    });
  });

  describe('Public routes bypass authentication', () => {
    it('should allow access to /health without auth', async () => {
      const app = createTestApp();
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should allow access to /api/auth/login without auth', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' });
      expect(response.status).toBe(200);
    });

    it('should allow access to /api/auth/register without auth', async () => {
      const app = createTestApp();
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test', password: 'test' });
      expect(response.status).toBe(201);
    });

    it('should allow access to /api/auth/verify without auth', async () => {
      const app = createTestApp();
      const response = await request(app).get('/api/auth/verify');
      expect(response.status).toBe(200);
    });
  });
});

