/**
 * Tests for export/import/clear API routes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { closeDatabase } from '../db/database.js';

// Create test app instance
const app = express();
app.use(express.json());

// Import routes dynamically after app setup
let exportRoutes: express.Router;

beforeAll(async () => {
  const mod = await import('./export.js');
  exportRoutes = mod.default;
  app.use('/api/export', exportRoutes);
});

afterAll(() => {
  closeDatabase();
});

describe('GET /api/export', () => {
  it('returns export data with correct structure', async () => {
    const response = await request(app).get('/api/export');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('exportDate');
    expect(response.body).toHaveProperty('profiles');
    expect(response.body).toHaveProperty('sessions');
    expect(response.body).toHaveProperty('messages');
    expect(response.body).toHaveProperty('actionItems');
    expect(response.body).toHaveProperty('content');
    expect(Array.isArray(response.body.profiles)).toBe(true);
    expect(Array.isArray(response.body.sessions)).toBe(true);
  });

  it('returns empty arrays when no data exists', async () => {
    const response = await request(app).get('/api/export');
    
    expect(response.status).toBe(200);
    expect(response.body.profiles).toHaveLength(0);
    expect(response.body.sessions).toHaveLength(0);
    expect(response.body.messages).toHaveLength(0);
  });
});

describe('POST /api/export/import', () => {
  it('rejects import with missing required fields', async () => {
    const response = await request(app)
      .post('/api/export/import')
      .send({ version: '1.0.0' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('missing required fields');
  });

  it('imports valid data successfully', async () => {
    const exportData = {
      version: '1.0.0',
      profiles: [
        {
          id: 'test-profile-1',
          name: 'Test User',
          bio: 'A test user',
          encrypted_data: '{}',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      sessions: [
        {
          id: 'test-session-1',
          profile_id: 'test-profile-1',
          status: 'summary',
          started_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      messages: [
        {
          id: 'test-msg-1',
          session_id: 'test-session-1',
          role: 'user',
          content: 'Hello',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      actionItems: [
        {
          id: 'test-ai-1',
          session_id: 'test-session-1',
          content: 'Reflect on Stoicism',
          completed: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      content: [],
    };

    const response = await request(app)
      .post('/api/export/import')
      .send(exportData);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.imported.profiles).toBe(1);
    expect(response.body.imported.sessions).toBe(1);
    expect(response.body.imported.messages).toBe(1);
    expect(response.body.imported.actionItems).toBe(1);

    // Verify data was actually imported
    const verifyResponse = await request(app).get('/api/export');
    expect(verifyResponse.body.profiles).toHaveLength(1);
    expect(verifyResponse.body.profiles[0].name).toBe('Test User');
  });
});

describe('POST /api/export/clear', () => {
  it('clears all user data', async () => {
    // First, ensure there's some data to clear
    const preClearResponse = await request(app).get('/api/export');
    const preClearProfileCount = preClearResponse.body.profiles.length;
    
    const response = await request(app).post('/api/export/clear');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.cleared).toHaveProperty('profiles');
    expect(response.body.cleared).toHaveProperty('sessions');
    expect(response.body.cleared).toHaveProperty('messages');
    expect(response.body.cleared).toHaveProperty('actionItems');
    // The clear operation should clear profiles
    expect(response.body.cleared.profiles).toBe(preClearProfileCount);

    // Verify data was actually cleared
    const postClearResponse = await request(app).get('/api/export');
    expect(postClearResponse.body.profiles).toHaveLength(0);
    expect(postClearResponse.body.sessions).toHaveLength(0);
    expect(postClearResponse.body.messages).toHaveLength(0);
    expect(postClearResponse.body.actionItems).toHaveLength(0);
  });

  it('can clear when database is already empty', async () => {
    const response = await request(app).post('/api/export/clear');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
