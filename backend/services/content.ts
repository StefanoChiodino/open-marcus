import type { DatabaseService } from '../db/database.js';
import type { ContentItem } from '../lib/content-schema.js';
import { meditations } from '../lib/meditations.js';
import { senecaQuotes } from '../lib/seneca.js';
import { epictetusSayings } from '../lib/epictetus.js';

/**
 * Content service - handles stoic content library business logic
 */
export class ContentService {
  private db: DatabaseService | null = null;
  private dbGetter: () => DatabaseService;

  constructor(dbGetter?: () => DatabaseService) {
    this.dbGetter = dbGetter || (() => {
      // Dynamic import to avoid circular dependency issues
      const { getDatabase } = require('../db/database.js');
      return getDatabase();
    });
  }

  private getDb(): DatabaseService {
    if (!this.db) {
      this.db = this.dbGetter();
    }
    return this.db;
  }

  /**
   * Seed the content library with stoic quotes and excerpts
   */
  seedContent(): number {
    const allContent: ContentItem[] = [
      ...meditations,
      ...senecaQuotes,
      ...epictetusSayings,
    ];
    return this.getDb().seedContent(allContent);
  }

  /**
   * Get random stoic quotes
   */
  getRandomQuotes(count: number = 3): ContentItem[] {
    return this.getDb().getRandomQuotes(count);
  }

  /**
   * Search content by query, tag, or author
   */
  searchContent(query?: string, tag?: string, author?: string, limit: number = 10): ContentItem[] {
    return this.getDb().searchContent(query, tag, author, limit);
  }

  /**
   * Get content for AI context injection (RAG)
   * Returns a formatted string suitable for injecting into an LLM system prompt
   */
  getContextForAI(query?: string, limit: number = 5): string {
    let results: ContentItem[] = [];

    if (query) {
      results = this.getDb().searchContent(query, undefined, undefined, limit);
      if (results.length === 0) {
        return '';
      }
    } else {
      // If no query, use tags to get relevant content
      results = this.getDb().getContentByTags([], limit);
    }

    const contextLines = results.map(item => {
      const source = [item.source, item.book, item.letter, item.section]
        .filter(Boolean)
        .join(', ');
      return `"${item.content}" — ${item.author}, ${source}`;
    });

    return `Relevant stoic wisdom to draw from:\n${contextLines.join('\n')}`;
  }

  /**
   * Get all unique tags in the content library
   */
  getAllTags(): string[] {
    return this.getDb().getAllTags();
  }

  /**
   * Get the total content count
   */
  getContentCount(): number {
    return this.getDb().getContentCount();
  }
}

// Singleton instance
let contentServiceInstance: ContentService | null = null;

export function getContentService(dbGetter?: () => DatabaseService): ContentService {
  if (!contentServiceInstance) {
    contentServiceInstance = new ContentService(dbGetter);
  }
  return contentServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetContentService(): void {
  contentServiceInstance = null;
}
