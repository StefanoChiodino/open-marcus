import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../db/database.js';
import { SessionService, resetSessionService, ValidationError } from '../services/session.js';
import { resetProfileService } from '../services/profile.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Create test app with injected database
function createTestApp(db: DatabaseService): Express {
  const app = express();
  app.use(express.json());

  // Reset and create new services with test database
  resetSessionService();
  resetProfileService();
  const sessionService = new SessionService(() => db);

  // GET /api/sessions - List all sessions
  app.get('/api/sessions', (_req, res) => {
    try {
      const sessions = sessionService.listAllSessions();
      const sessionsWithMeta = sessions.map(session => {
        const messages = sessionService.listMessages(session.id);
        return {
          ...session,
          message_count: messages.length,
          first_message: messages.length > 0 ? messages[0].content : null,
        };
      });
      res.json(sessionsWithMeta);
    } catch (error) {
      console.error('Error listing sessions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/sessions/:id - Get session with messages
  app.get('/api/sessions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const result = sessionService.getSession(id);

      if (!result) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/sessions - Create a new session
  app.post('/api/sessions', (req, res) => {
    try {
      const { profile_id } = req.body;

      if (!profile_id) {
        res.status(400).json({ error: 'Profile ID is required' });
        return;
      }

      const session = sessionService.createSession(profile_id);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/sessions/:id/messages - Add a message to a session
  app.post('/api/sessions/:id/messages', (req, res) => {
    try {
      const { id } = req.params;
      const { role, content } = req.body;

      if (!role || !content) {
        res.status(400).json({ error: 'Role and content are required' });
        return;
      }

      const message = sessionService.addMessage(id, role, content);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/sessions/:id/end - End a session with summary
  app.put('/api/sessions/:id/end', (req, res) => {
    try {
      const { id } = req.params;
      const { summary, action_items } = req.body;

      if (!summary) {
        res.status(400).json({ error: 'Session summary is required' });
        return;
      }

      const session = sessionService.endSession(id, summary, action_items || []);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }

      console.error('Error ending session:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

describe('Session Routes', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `session-route-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let app: Express;
  let profileId: string;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    process.env.ENCRYPTION_KEY = encryptionPassword;
    app = createTestApp(db);

    // Create a profile for testing
    const profile = db.createProfile('Test User', 'Test Bio');
    profileId = profile.id;
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignore
    }
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch {
      // Ignore
    }
  });

  describe('POST /api/sessions', () => {
    it('should create a session with 201 status', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.profile_id).toBe(profileId);
      expect(res.body.status).toBe('intro');
    });

    it('should return 400 when profile_id is missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile ID is required');
    });

    it('should return 400 for non-existent profile', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ profile_id: randomUUID() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile not found');
    });
  });

  describe('GET /api/sessions', () => {
    it('should return empty list when no sessions exist', async () => {
      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return list of sessions with metadata', async () => {
      // Create two sessions
      await request(app).post('/api/sessions').send({ profile_id: profileId });
      await request(app).post('/api/sessions').send({ profile_id: profileId });

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].message_count).toBe(0);
    });

    it('should include message count and first message', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      // Add messages
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'user', content: 'First message' });
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'assistant', content: 'Response' });

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].message_count).toBe(2);
      expect(res.body[0].first_message).toBe('First message');
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session with messages', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      // Add messages
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'user', content: 'Hello' });
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'assistant', content: 'Hi there' });

      const res = await request(app).get(`/api/sessions/${sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.session.id).toBe(sessionId);
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages[0].role).toBe('user');
      expect(res.body.messages[1].role).toBe('assistant');
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).get(`/api/sessions/${randomUUID()}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('should return session with empty messages array', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app).get(`/api/sessions/${sessionId}`);

      expect(res.status).toBe(200);
      expect(res.body.session.id).toBe(sessionId);
      expect(res.body.messages).toEqual([]);
    });
  });

  describe('POST /api/sessions/:id/messages', () => {
    it('should add a message with 201 status', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'user', content: 'Hello, Marcus' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('user');
      expect(res.body.content).toBe('Hello, Marcus');
      expect(res.body.session_id).toBe(sessionId);
    });

    it('should add an assistant message', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'assistant', content: 'Welcome!' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('assistant');
    });

    it('should return 400 when role is missing', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Role and content are required');
    });

    it('should return 400 when content is missing', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Role and content are required');
    });

    it('should return 400 for non-existent session', async () => {
      const res = await request(app)
        .post(`/api/sessions/${randomUUID()}/messages`)
        .send({ role: 'user', content: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session not found');
    });
  });

  describe('PUT /api/sessions/:id/end', () => {
    it('should end a session with summary', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      // Add some messages first
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'user', content: 'Hello' });
      await request(app)
        .post(`/api/sessions/${sessionId}/messages`)
        .send({ role: 'assistant', content: 'Hi' });

      const res = await request(app)
        .put(`/api/sessions/${sessionId}/end`)
        .send({
          summary: 'Great session today',
          action_items: ['Meditate daily', 'Practice gratitude'],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('summary');
      expect(res.body.summary).toBe('Great session today');
      expect(res.body.ended_at).toBeDefined();
    });

    it('should return 400 when summary is missing', async () => {
      const createRes = await request(app)
        .post('/api/sessions')
        .send({ profile_id: profileId });

      const sessionId = createRes.body.id as string;

      const res = await request(app)
        .put(`/api/sessions/${sessionId}/end`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session summary is required');
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .put(`/api/sessions/${randomUUID()}/end`)
        .send({ summary: 'Summary' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Session not found');
    });
  });
});
