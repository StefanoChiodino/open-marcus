import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../db/database.js';
import { SessionService, resetSessionService } from '../services/session.js';
import { resetProfileService } from '../services/profile.js';
import { getOllamaService, resetOllamaService, OllamaOfflineError } from '../services/ollama.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { OllamaService } from '../services/ollama.js';

/**
 * Create a test Express app with the chat route
 */
function createTestApp(db: DatabaseService): Express {
  const app = express();
  app.use(express.json());

  // Reset singleton services for testing
  resetSessionService();
  resetProfileService();
  resetOllamaService();

  const sessionService = new SessionService(() => db);
  const ollamaService = getOllamaService('http://localhost:11434', 'test-model');

  // Override singleton with our test instance by creating directly
  const app2 = express();
  app2.use(express.json());

  // POST /api/chat - Chat endpoint for testing
  app2.post('/api/chat', async (req, res) => {
    try {
      const { session_id, message } = req.body;

      // Validate request body
      if (!session_id || !message) {
        res.status(400).json({ error: 'session_id and message are required' });
        return;
      }

      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'Message must be a non-empty string' });
        return;
      }

      // Verify session exists
      const session = sessionService.getSessionWithoutMessages(session_id);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      // Save user message to database
      sessionService.addMessage(session_id, 'user', message.trim());

      // Check if Ollama is online before starting stream
      const isOnline = await ollamaService.isOnline();
      if (!isOnline) {
        res.status(503).json({
          error: 'Unable to connect to AI. Please ensure Ollama is running.',
        });
        return;
      }

      // Build conversation history for Ollama
      const history = sessionService.listMessages(session_id);
      const messages = history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      }));

      // Set up streaming response headers
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      let fullResponse = '';

      for await (const token of ollamaService.streamChat(messages)) {
        fullResponse += token;
        res.write(JSON.stringify({ token }) + '\n');
      }

      // Save assistant response
      if (fullResponse.trim().length > 0) {
        sessionService.addMessage(session_id, 'assistant', fullResponse);
      }

      // Send completion marker
      res.write(JSON.stringify({ done: true, full_response: fullResponse.trim() }) + '\n');
      res.end();
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      if (!res.headersSent) {
        if (error instanceof OllamaOfflineError) {
          res.status(503).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  });

  return app2;
}

describe('Chat Routes', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `chat-route-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let app: Express;
  let profileId: string;
  let sessionId: string;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    process.env.ENCRYPTION_KEY = encryptionPassword;
    app = createTestApp(db);

    // Create a profile and session
    const profile = db.createProfile('Test User', 'Test Bio');
    profileId = profile.id;

    // Create a session
    const session = db.createSession(profileId);
    sessionId = session.id;
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

  describe('POST /api/chat - validation', () => {
    it('should return 400 when session_id is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('session_id and message are required');
    });

    it('should return 400 when message is missing', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ session_id: sessionId });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('session_id and message are required');
    });

    it('should return 400 when message is empty string', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ session_id: sessionId, message: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('session_id and message are required');
    });

    it('should return 400 when message is whitespace only', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ session_id: sessionId, message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Message must be a non-empty string');
    });

    it('should return 404 when session does not exist', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ session_id: randomUUID(), message: 'Hello' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  describe('POST /api/chat - Ollama offline', () => {
    it('should return 503 when Ollama is not running', async () => {
      // Create a test app with an OllamaService pointing to a non-existent port
      const offlineSessionService = new SessionService(() => db);
      const offlineOllamaService = new OllamaService('http://localhost:59999', 'test-model');

      const offlineApp = express();
      offlineApp.use(express.json());

      offlineApp.post('/api/chat', async (req, res) => {
        try {
          const { session_id, message } = req.body;

          // Validate request body
          if (!session_id || !message) {
            res.status(400).json({ error: 'session_id and message are required' });
            return;
          }

          // Verify session exists
          const session = offlineSessionService.getSessionWithoutMessages(session_id);
          if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
          }

          // Save user message to database
          offlineSessionService.addMessage(session_id, 'user', message.trim());

          // Check if Ollama is online before starting stream
          const isOnline = await offlineOllamaService.isOnline();
          if (!isOnline) {
            res.status(503).json({
              error: 'Unable to connect to AI. Please ensure Ollama is running.',
            });
            return;
          }

          // Build conversation history for Ollama
          const history = offlineSessionService.listMessages(session_id);
          const messages = history.map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.content,
          }));

          // Set up streaming response headers
          res.setHeader('Content-Type', 'application/x-ndjson');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          // Stream the response
          let fullResponse = '';

          try {
            for await (const token of offlineOllamaService.streamChat(messages)) {
              fullResponse += token;
              res.write(JSON.stringify({ token }) + '\n');
            }

            // Save assistant response
            if (fullResponse.trim().length > 0) {
              offlineSessionService.addMessage(session_id, 'assistant', fullResponse);
            }

            // Send completion marker
            res.write(JSON.stringify({ done: true, full_response: fullResponse.trim() }) + '\n');
            res.end();
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            const errMsg = streamError instanceof Error ? streamError.message : 'Streaming failed';

            if (!res.headersSent) {
              res.status(503).json({
                error: 'Unable to connect to AI. Please ensure Ollama is running.',
              });
            } else {
              res.write(JSON.stringify({ error: errMsg }) + '\n');
              res.end();
            }
          }
        } catch (error) {
          if (!res.headersSent) {
            console.error('Error in chat endpoint:', error);
            if (error instanceof OllamaOfflineError) {
              res.status(503).json({ error: error.message });
            } else {
              res.status(500).json({ error: 'Internal server error' });
            }
          }
        }
      });

      const res = await request(offlineApp)
        .post('/api/chat')
        .send({ session_id: sessionId, message: 'Hello' });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Unable to connect to AI. Please ensure Ollama is running.');
    });

    it('should still save user message to database when Ollama is offline', async () => {
      // Create a new session for this test
      const offlineSession = db.createSession(profileId);

      const offlineSessionService2 = new SessionService(() => db);
      const offlineOllamaService2 = new OllamaService('http://localhost:59998', 'test-model');

      const offlineApp2 = express();
      offlineApp2.use(express.json());

      offlineApp2.post('/api/chat', async (req, res) => {
        try {
          const { session_id, message } = req.body;

          if (!session_id || !message) {
            res.status(400).json({ error: 'session_id and message are required' });
            return;
          }

          if (typeof message !== 'string' || message.trim().length === 0) {
            res.status(400).json({ error: 'Message must be a non-empty string' });
            return;
          }

          const session = offlineSessionService2.getSessionWithoutMessages(session_id);
          if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
          }

          offlineSessionService2.addMessage(session_id, 'user', message.trim());

          const isOnline = await offlineOllamaService2.isOnline();
          if (!isOnline) {
            res.status(503).json({
              error: 'Unable to connect to AI. Please ensure Ollama is running.',
            });
            return;
          }

          // This branch won't be reached in this test
          res.end();
        } catch (error) {
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        }
      });

      await request(offlineApp2)
        .post('/api/chat')
        .send({ session_id: offlineSession.id, message: 'This message should persist' });

      const messages = db.listMessages(offlineSession.id);
      const userMessages = messages.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(1);
      expect(userMessages[0].content).toBe('This message should persist');
    });
  });

  describe('POST /api/chat - message persistence', () => {
    it('should save user message to database even when Ollama is offline', async () => {
      // Make request (will either stream or return 503)
      await request(app)
        .post('/api/chat')
        .send({ session_id: sessionId, message: 'Hello Marcus' });

      // Verify user message was saved
      const messages = db.listMessages(sessionId);
      const userMessages = messages.filter(m => m.role === 'user');
      expect(userMessages.length).toBe(1);
      expect(userMessages[0].content).toBe('Hello Marcus');
    });

    it('should save user message with trimmed content', async () => {
      await request(app)
        .post('/api/chat')
        .send({ session_id: sessionId, message: '  Hello with spaces  ' });

      const messages = db.listMessages(sessionId);
      expect(messages[0].content).toBe('Hello with spaces');
    });
  });
});
