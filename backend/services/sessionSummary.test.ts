import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SessionSummaryService,
  resetSessionSummaryService,
} from './sessionSummary.js';
import { SessionService, resetSessionService } from './session.js';
import { ProfileService, resetProfileService } from './profile.js';
import {
  OllamaService,
  resetOllamaService,
} from './ollama.js';
import { DatabaseService } from '../db/database.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

describe('Session Summary Service', () => {
  const testDir = path.join(process.cwd(), 'test-data');
  const testDbPath = path.join(testDir, `session-summary-test-${randomUUID()}.db`);
  const encryptionPassword = 'test-encryption-password';
  let db: DatabaseService;
  let sessionService: SessionService;
  let profileService: ProfileService;
  let summaryService: SessionSummaryService;
  let profileId: string;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    db = new DatabaseService(testDbPath, encryptionPassword);
    resetSessionService();
    resetProfileService();
    resetOllamaService();
    resetSessionSummaryService();
    process.env.ENCRYPTION_KEY = encryptionPassword;

    sessionService = new SessionService(() => db);
    profileService = new ProfileService(() => db);
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
    resetSessionSummaryService();
  });

  describe('generateSummary', () => {
    it('should return fallback summary for empty session', async () => {
      // Create a mock OllamaService that throws (simulating offline)
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');

      const profile = profileService.createProfile('Test User', 'Bio');
      profileId = profile.id;
      const session = sessionService.createSession(profileId);

      // Inject services
      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      const result = await summaryService.generateSummary(session.id);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.actionItems).toBeDefined();
      expect(Array.isArray(result.actionItems)).toBe(true);
    });

    it('should throw error for non-existent session', async () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');
      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      await expect(summaryService.generateSummary(randomUUID())).rejects.toThrow('Session not found');
    });

    it('should return summary with user name when profile exists', async () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');

      const profile = profileService.createProfile('Aurelia', 'Philosophy student');
      profileId = profile.id;
      const session = sessionService.createSession(profileId);

      // Add some messages
      sessionService.addMessage(session.id, 'user', 'How do I deal with anger?');
      sessionService.addMessage(session.id, 'assistant', 'Anger is a temporary madness...');

      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      const result = await summaryService.generateSummary(session.id);

      expect(result.summary).toContain('Aurelia');
    });
  });

  describe('extractActionItems', () => {
    it('should return default action items for empty session when Ollama offline', async () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');

      const profile = profileService.createProfile('Test User', 'Bio');
      profileId = profile.id;
      const session = sessionService.createSession(profileId);

      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      const items = await summaryService.extractActionItems(session.id);

      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent session', async () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');
      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      await expect(summaryService.extractActionItems(randomUUID())).rejects.toThrow('Session not found');
    });

    it('should return default items when conversation is empty', async () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');

      const profile = profileService.createProfile('Test User', 'Bio');
      profileId = profile.id;
      const session = sessionService.createSession(profileId);

      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      const items = await summaryService.extractActionItems(session.id);

      expect(items).toContain('Take time for quiet reflection daily');
    });
  });

  describe('parseSummaryResponse', () => {
    it('should parse valid JSON response', () => {
      const mockOllamaService = new OllamaService('http://localhost:59999', 'test-model');
      summaryService = new SessionSummaryService(mockOllamaService, sessionService, profileService);

      // Access private method via casting (test only)
      const result = (summaryService as any).parseSummaryResponse(
        '{"summary":"Test summary","actionItems":["Item 1","Item 2"]}',
      );

      expect(result.summary).toBe('Test summary');
      expect(result.actionItems).toEqual(['Item 1', 'Item 2']);
    });

    it('should parse JSON in markdown code blocks', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const result = (summaryService as any).parseSummaryResponse(
        '```json\n{"summary":"Test","actionItems":["Item"]}\n```',
      );

      expect(result.summary).toBe('Test');
      expect(result.actionItems).toEqual(['Item']);
    });

    it('should handle non-JSON response with fallback', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const result = (summaryService as any).parseSummaryResponse('This is not JSON at all');

      expect(result.summary).toBe('This is not JSON at all');
      expect(result.actionItems).toEqual([]);
    });

    it('should handle missing fields in JSON', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const result = (summaryService as any).parseSummaryResponse(
        '{"other_field":"value"}',
      );

      expect(result.summary).toBe('A meaningful conversation took place.');
      expect(result.actionItems).toEqual([]);
    });
  });

  describe('parseActionItemsResponse', () => {
    it('should parse valid JSON array', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const items = (summaryService as any).parseActionItemsResponse('["Item 1", "Item 2"]');

      expect(items).toEqual(['Item 1', 'Item 2']);
    });

    it('should parse JSON array in markdown code blocks', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const items = (summaryService as any).parseActionItemsResponse(
        '```json\n["Item 1", "Item 2"]\n```',
      );

      expect(items).toEqual(['Item 1', 'Item 2']);
    });

    it('should return empty array for non-JSON response', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const items = (summaryService as any).parseActionItemsResponse('Not JSON');

      expect(items).toEqual([]);
    });

    it('should return empty array for non-array JSON', () => {
      summaryService = new SessionSummaryService(
        new OllamaService('http://localhost:59999', 'test-model'),
        sessionService,
      );

      const items = (summaryService as any).parseActionItemsResponse('{"key":"value"}');

      expect(items).toEqual([]);
    });
  });
});
