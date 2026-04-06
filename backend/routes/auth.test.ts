/**
 * Tests for authentication routes
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../db/database.js';
import { hash, verify } from '../crypto/password.js';
import { generateToken, verifyToken, blacklistToken } from '../crypto/token.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Test database setup
const testDir = path.join(process.cwd(), 'test-data');
const testDbPath = path.join(testDir, `test-auth-${randomUUID()}.db`);
const encryptionPassword = 'test-encryption-password';
let db: DatabaseService;

describe('Auth Routes', () => {
  let app: Express;

  // Helper function to create auth routes with a specific database
  function createAuthApp(database: DatabaseService): Express {
    const authApp = express();
    authApp.use(express.json());

    // POST /api/auth/register
    authApp.post('/api/auth/register', async (req, res) => {
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

        // Check if username already exists
        if (database.usernameExists(username.trim())) {
          res.status(409).json({ error: 'Username already exists' });
          return;
        }

        // Hash the password
        const passwordHash = await hash(password);

        // Create the user
        const user = database.createUser(username.trim(), passwordHash);

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
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // POST /api/auth/login
    authApp.post('/api/auth/login', async (req, res) => {
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

        // Find user by username
        const user = database.getUserByUsername(username.trim());

        if (!user) {
          res.status(401).json({ error: 'Invalid username or password' });
          return;
        }

        // Verify password
        const isValid = await verify(user.password_hash, password);

        if (!isValid) {
          res.status(401).json({ error: 'Invalid username or password' });
          return;
        }

        // Generate session token
        const token = generateToken(user.id, user.username);

        // Return user info and token
        res.status(200).json({
          user: {
            id: user.id,
            username: user.username,
          },
          token,
        });
      } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GET /api/auth/verify
    authApp.get('/api/auth/verify', (req, res) => {
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

    // POST /api/auth/logout
    authApp.post('/api/auth/logout', (req, res) => {
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

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    return authApp;
  }

  beforeAll(() => {
    // Ensure test-data directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
  });

  beforeEach(() => {
    // Create a new Express app for each test with the test database
    app = createAuthApp(db);
  });

  afterEach(() => {
    // Clean up users table after each test
    try {
      db.deleteAllUsers();
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with user and token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 400 if username is empty', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: '', password: 'testpassword123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Username is required');
    });

    it('should return 400 if username is only whitespace', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: '   ', password: 'testpassword123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Username is required');
    });

    it('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'testpassword123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Username is required');
    });

    it('should return 400 if password is empty', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Password is required');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Password is required');
    });

    it('should return 409 if username already exists', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'existinguser', password: 'testpassword123' });

      // Second registration with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'existinguser', password: 'differentpassword' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Username already exists');
    });

    it('should allow registration with case-different username of existing user', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      // Second registration with different case
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'TestUser', password: 'differentpassword' });

      // This should succeed since username comparison is case-sensitive
      expect(response.status).toBe(201);
    });

    it('should hash the password before storage', async () => {
      const password = 'testpassword123';
      
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password });

      // Verify the user was created with a hashed password
      const user = db.getUserByUsername('testuser');
      expect(user).not.toBeNull();
      expect(user!.password_hash).not.toBe(password);
      expect(user!.password_hash).toMatch(/^\$argon2id\$/);
    });

    it('should return a valid token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      
      // Token should have two parts (payload.signature)
      const tokenParts = response.body.token.split('.');
      expect(tokenParts.length).toBe(2);
    });

    it('should trim whitespace from username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: '  testuser  ', password: 'testpassword123' });

      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe('testuser');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });
    });

    it('should login with correct credentials and return 200', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpassword123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid username or password');
    });

    it('should return 401 with non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'testpassword123' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid username or password');
    });

    it('should return 400 if username is empty', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'testpassword123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username is required');
    });

    it('should return 400 if password is empty', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password is required');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify a valid token', async () => {
      // First register to get a token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      const token = registerResponse.body.token;

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.username).toBe('testuser');
    });

    it('should return 401 without Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'NotBearer sometoken');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token and return 200', async () => {
      // First register to get a token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      const token = registerResponse.body.token;

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should invalidate token so subsequent requests return 401', async () => {
      // First register to get a token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpassword123' });

      const token = registerResponse.body.token;

      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the now-invalidated token
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(verifyResponse.status).toBe(401);
      expect(verifyResponse.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 without Authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'NotBearer sometoken');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});
