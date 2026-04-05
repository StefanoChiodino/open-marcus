import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { DatabaseService } from '../db/database.js';
import { ContentService, resetContentService } from '../services/content.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Create test app with injected database
function createTestApp(db: DatabaseService): Express {
  const app = express();
  app.use(express.json());

  // Reset and create new services with test database
  resetContentService();
  new ContentService(() => db);

  // GET /api/content/quotes - Get random stoic quotes
  app.get('/api/content/quotes', (req, res) => {
    try {
      const countParam = req.query.count;
      let count: number;
      
      if (countParam !== undefined) {
        count = parseInt(countParam as string, 10);
        if (isNaN(count) || count < 1 || count > 20) {
          res.status(400).json({ error: 'Count must be between 1 and 20' });
          return;
        }
      } else {
        count = 3;
      }
      
      const quotes = new ContentService(() => db).getRandomQuotes(count);
      
      res.json({
        quotes,
        count: quotes.length,
      });
    } catch (error) {
      console.error('Error getting quotes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/content/search - Search stoic content
  app.get('/api/content/search', (req, res) => {
    try {
      const query = (req.query.q as string) || undefined;
      const tag = (req.query.tag as string) || undefined;
      const author = (req.query.author as string) || undefined;
      const limitParam = parseInt(req.query.limit as string, 10);
      const limit = isNaN(limitParam) ? 10 : limitParam;
      
      if (isNaN(limit) || limit < 1 || limit > 50) {
        res.status(400).json({ error: 'Limit must be between 1 and 50' });
        return;
      }
      
      if (!query && !tag && !author) {
        res.status(400).json({ error: 'Provide at least one of: q, tag, or author' });
        return;
      }
      
      const contentService = new ContentService(() => db);
      const results = contentService.searchContent(query, tag, author, limit);
      
      res.json({
        results,
        count: results.length,
        query: query || '',
        tag: tag || '',
        author: author || '',
      });
    } catch (error) {
      console.error('Error searching content:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

describe('Content Routes', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `content-route-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let app: Express;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    app = createTestApp(db);

    // Seed content for testing
    const contentService = new ContentService(() => db);
    contentService.seedContent();
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

  describe('GET /api/content/quotes', () => {
    it('should return random quotes with 200 status', async () => {
      const res = await request(app).get('/api/content/quotes');

      expect(res.status).toBe(200);
      expect(res.body.quotes).toBeDefined();
      expect(Array.isArray(res.body.quotes)).toBe(true);
      expect(res.body.count).toBe(3); // default count
      expect(res.body.quotes.length).toBe(3);
    });

    it('should return specified number of quotes', async () => {
      const res = await request(app).get('/api/content/quotes?count=5');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(5);
      expect(res.body.quotes.length).toBe(5);
    });

    it('should return valid quote structure', async () => {
      const res = await request(app).get('/api/content/quotes');

      const quote = res.body.quotes[0];
      expect(quote.id).toBeDefined();
      expect(quote.author).toBeDefined();
      expect(quote.source).toBeDefined();
      expect(quote.type).toBeDefined();
      expect(quote.content).toBeDefined();
      expect(quote.tags).toBeDefined();
    });

    it('should return 400 for invalid count', async () => {
      const res = await request(app).get('/api/content/quotes?count=0');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Count must be between 1 and 20');
    });

    it('should return 400 for count > 20', async () => {
      const res = await request(app).get('/api/content/quotes?count=21');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Count must be between 1 and 20');
    });
  });

  describe('GET /api/content/search', () => {
    it('should search by query text', async () => {
      const res = await request(app).get('/api/content/search?q=strength');

      expect(res.status).toBe(200);
      expect(res.body.results).toBeDefined();
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.query).toBe('strength');
    });

    it('should filter by tag', async () => {
      const res = await request(app).get('/api/content/search?tag=wisdom');

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.tag).toBe('wisdom');
      for (const result of res.body.results) {
        expect(result.tags).toContain('wisdom');
      }
    });

    it('should filter by author', async () => {
      const res = await request(app).get('/api/content/search?author=Marcus Aurelius');

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.author).toBe('Marcus Aurelius');
      for (const result of res.body.results) {
        expect(result.author).toBe('Marcus Aurelius');
      }
    });

    it('should combine query and author filters', async () => {
      const res = await request(app).get('/api/content/search?q=anger&author=Seneca');

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      for (const result of res.body.results) {
        expect(result.author).toBe('Seneca');
      }
    });

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/content/search?q=wisdom&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.count).toBeLessThanOrEqual(2);
    });

    it('should return 400 when no search parameters provided', async () => {
      const res = await request(app).get('/api/content/search');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Provide at least one of: q, tag, or author');
    });

    it('should return 400 for invalid limit', async () => {
      const res = await request(app).get('/api/content/search?q=test&limit=51');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Limit must be between 1 and 50');
    });
  });
});
