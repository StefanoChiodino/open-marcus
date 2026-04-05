import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../db/database.js';
import { ProfileService, resetProfileService, ValidationError } from '../services/profile.js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Create test app with injected database
function createTestApp(db: DatabaseService): Express {
  const app = express();
  app.use(express.json());
  
  // Reset and create new profile service with test database
  resetProfileService();
  const profileService = new ProfileService(() => db);
  
  // We need to patch the routes to use our profile service
  // Since routes use getProfileService(), we need to create routes that use the provided service
  const router = express.Router();
  
  // GET /api/profile - Get current profile
  router.get('/', (_req: Request, res: Response, _next: NextFunction) => {
    try {
      const profile = profileService.getCurrentProfile();
      
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/profile - Create new profile
  router.post('/', (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { name, bio } = req.body as { name?: string; bio?: string };
      
      const profile = profileService.createProfile(name || '', bio ?? null);
      
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      
      console.error('Error creating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/profile - Update current profile
  router.put('/', (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { id, name, bio } = req.body as { id?: string; name?: string; bio?: string };
      
      if (!id) {
        res.status(400).json({ error: 'Profile ID is required' });
        return;
      }
      
      const profile = profileService.updateProfile(id, name ?? '', bio ?? null);
      
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      
      res.json(profile);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/profile - Delete current profile
  router.delete('/', (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { id } = req.body as { id?: string };
      
      if (!id) {
        res.status(400).json({ error: 'Profile ID is required' });
        return;
      }
      
      const deleted = profileService.deleteProfile(id);
      
      if (!deleted) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.use('/api/profile', router);
  
  return app;
}

describe('Profile Routes', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `route-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let app: Express;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    process.env.ENCRYPTION_KEY = encryptionPassword;
    app = createTestApp(db);
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

  describe('GET /api/profile', () => {
    it('should return 404 when no profile exists', async () => {
      const res = await request(app).get('/api/profile');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Profile not found');
    });

    it('should return profile when it exists', async () => {
      // Create a profile first
      await request(app)
        .post('/api/profile')
        .send({ name: 'Test User', bio: 'Test Bio' });
      
      const res = await request(app).get('/api/profile');
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test User');
      expect(res.body.bio).toBe('Test Bio');
    });
  });

  describe('POST /api/profile', () => {
    it('should create profile with 201 status', async () => {
      const res = await request(app)
        .post('/api/profile')
        .send({ name: 'Marcus', bio: 'Roman Emperor' });
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Marcus');
      expect(res.body.bio).toBe('Roman Emperor');
      expect(res.body.id).toBeDefined();
    });

    it('should create profile with name only', async () => {
      const res = await request(app)
        .post('/api/profile')
        .send({ name: 'Seneca' });
      
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Seneca');
      expect(res.body.bio).toBeNull();
    });

    it('should return 400 for empty name', async () => {
      const res = await request(app)
        .post('/api/profile')
        .send({ name: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/profile')
        .send({ bio: 'Some bio' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });
  });

  describe('PUT /api/profile', () => {
    it('should update profile', async () => {
      // Create profile first
      const createRes = await request(app)
        .post('/api/profile')
        .send({ name: 'Original', bio: 'Original Bio' });
      
      const { id } = createRes.body as { id: string };
      
      const res = await request(app)
        .put('/api/profile')
        .send({ id, name: 'Updated', bio: 'Updated Bio' });
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
      expect(res.body.bio).toBe('Updated Bio');
    });

    it('should return 400 when id is missing', async () => {
      const res = await request(app)
        .put('/api/profile')
        .send({ name: 'New Name' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile ID is required');
    });

    it('should return 400 for empty name', async () => {
      const createRes = await request(app)
        .post('/api/profile')
        .send({ name: 'Test' });
      
      const { id } = createRes.body as { id: string };
      
      const res = await request(app)
        .put('/api/profile')
        .send({ id, name: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('should return 404 for non-existent profile', async () => {
      const res = await request(app)
        .put('/api/profile')
        .send({ id: randomUUID(), name: 'Test' });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Profile not found');
    });
  });

  describe('DELETE /api/profile', () => {
    it('should delete profile with 204 status', async () => {
      // Create profile first
      const createRes = await request(app)
        .post('/api/profile')
        .send({ name: 'To Delete' });
      
      const { id } = createRes.body as { id: string };
      
      const res = await request(app)
        .delete('/api/profile')
        .send({ id });
      
      expect(res.status).toBe(204);
      
      // Verify deleted
      const getRes = await request(app).get('/api/profile');
      expect(getRes.status).toBe(404);
    });

    it('should return 400 when id is missing', async () => {
      const res = await request(app)
        .delete('/api/profile')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile ID is required');
    });

    it('should return 404 for non-existent profile', async () => {
      const res = await request(app)
        .delete('/api/profile')
        .send({ id: randomUUID() });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Profile not found');
    });
  });
});
