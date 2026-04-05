import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentService, resetContentService } from './content.js';
import { DatabaseService } from '../db/database.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('ContentService', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `content-service-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let contentService: ContentService;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetContentService();
    contentService = new ContentService(() => db);
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

  describe('seedContent', () => {
    it('should seed stoic content into the database', () => {
      const seeded = contentService.seedContent();

      expect(seeded).toBeGreaterThan(0);
      const count = contentService.getContentCount();
      expect(count).toBe(seeded);
    });

    it('should seed content from all three sources', () => {
      contentService.seedContent();

      const meditations = contentService.searchContent(undefined, undefined, 'Marcus Aurelius');
      const senecaResults = contentService.searchContent(undefined, undefined, 'Seneca');
      const epictetusResults = contentService.searchContent(undefined, undefined, 'Epictetus');

      expect(meditations.length).toBeGreaterThan(0);
      expect(senecaResults.length).toBeGreaterThan(0);
      expect(epictetusResults.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomQuotes', () => {
    beforeEach(() => {
      contentService.seedContent();
    });

    it('should return random quotes', () => {
      const quotes = contentService.getRandomQuotes(3);

      expect(quotes.length).toBe(3);
      for (const quote of quotes) {
        expect(quote.id).toBeDefined();
        expect(quote.content).toBeDefined();
        expect(quote.author).toBeDefined();
        expect(quote.tags).toBeDefined();
        expect(Array.isArray(quote.tags)).toBe(true);
      }
    });

    it('should return different quotes on subsequent calls', () => {
      const first = contentService.getRandomQuotes(5);
      const second = contentService.getRandomQuotes(5);

      // With 60+ quotes, it's very unlikely to get the exact same 5
      const firstIds = new Set(first.map(q => q.id));
      const allSecondSame = second.every(q => firstIds.has(q.id));
      expect(allSecondSame).toBe(false);
    });

    it('should return default count of 3', () => {
      const quotes = contentService.getRandomQuotes();

      expect(quotes.length).toBe(3);
    });

    it('should handle requesting more quotes than available', () => {
      const quotes = contentService.getRandomQuotes(1000);

      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes.length).toBeLessThanOrEqual(contentService.getContentCount());
    });
  });

  describe('searchContent', () => {
    beforeEach(() => {
      contentService.seedContent();
    });

    it('should search by query text', () => {
      const results = contentService.searchContent('strength', undefined, undefined);

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        const hasMatch = result.content.toLowerCase().includes('strength') ||
          result.tags.some(t => t.toLowerCase().includes('strength'));
        expect(hasMatch).toBe(true);
      }
    });

    it('should filter by tag', () => {
      const results = contentService.searchContent(undefined, 'wisdom', undefined);

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.tags).toContain('wisdom');
      }
    });

    it('should filter by author', () => {
      const results = contentService.searchContent(undefined, undefined, 'Seneca');

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.author).toBe('Seneca');
      }
    });

    it('should combine query and author filters', () => {
      const results = contentService.searchContent('anger', undefined, 'Seneca');

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.author).toBe('Seneca');
        const hasMatch = result.content.toLowerCase().includes('anger') ||
          result.tags.some(t => t.toLowerCase().includes('anger'));
        expect(hasMatch).toBe(true);
      }
    });

    it('should respect limit parameter', () => {
      const results = contentService.searchContent(undefined, undefined, undefined, 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for non-existent tag', () => {
      const results = contentService.searchContent(undefined, 'nonexistenttag123', undefined);

      expect(results).toEqual([]);
    });

    it('should return empty array for non-existent author', () => {
      const results = contentService.searchContent(undefined, undefined, 'NonexistentAuthor');

      expect(results).toEqual([]);
    });
  });

  describe('getContextForAI', () => {
    beforeEach(() => {
      contentService.seedContent();
    });

    it('should return formatted context string for AI injection', () => {
      const context = contentService.getContextForAI('control');

      expect(context).toBeTruthy();
      expect(context).toContain('Relevant stoic wisdom');
      expect(context).toContain('"');
    });

    it('should return empty string when no matching content found', () => {
      const context = contentService.getContextForAI('xyznonexistenttag123');

      expect(context).toBe('');
    });

    it('should include author and source in context', () => {
      const context = contentService.getContextForAI('stoicism');

      expect(context).toBeTruthy();
      expect(context).toMatch(/— (Marcus Aurelius|Seneca|Epictetus),/);
    });

    it('should respect limit parameter', () => {
      const context = contentService.getContextForAI('wisdom', 2);

      // Count the number of quote entries (each starts with ")
      const quoteCount = (context.match(/"/g) || []).length / 2;
      expect(quoteCount).toBeLessThanOrEqual(2);
    });
  });

  describe('getAllTags', () => {
    beforeEach(() => {
      contentService.seedContent();
    });

    it('should return all unique tags', () => {
      const tags = contentService.getAllTags();

      expect(tags.length).toBeGreaterThan(0);
      expect(tags).toContain('wisdom');
      expect(tags).toContain('strength');
    });

    it('should return sorted tags', () => {
      const tags = contentService.getAllTags();

      for (let i = 1; i < tags.length; i++) {
        expect(tags[i] > tags[i - 1]).toBe(true);
      }
    });
  });

  describe('getContentCount', () => {
    it('should return 0 for empty database', () => {
      const count = contentService.getContentCount();

      expect(count).toBe(0);
    });

    it('should return correct count after seeding', () => {
      const seeded = contentService.seedContent();
      const count = contentService.getContentCount();

      expect(count).toBe(seeded);
    });
  });
});
