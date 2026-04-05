import { Router, Request, Response } from 'express';
import { getContentService } from '../services/content.js';

const router = Router();

// GET /api/content/quotes - Get random stoic quotes
// Query params: count (optional, default 3)
router.get('/quotes', (req: Request, res: Response) => {
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
    
    const contentService = getContentService();
    const quotes = contentService.getRandomQuotes(count);
    
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
// Query params: q (search query), tag (filter by tag), author (filter by author), limit (max results, default 10)
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || undefined;
    const tag = (req.query.tag as string) || undefined;
    const author = (req.query.author as string) || undefined;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    if (isNaN(limit) || limit < 1 || limit > 50) {
      res.status(400).json({ error: 'Limit must be between 1 and 50' });
      return;
    }
    
    if (!query && !tag && !author) {
      res.status(400).json({ error: 'Provide at least one of: q, tag, or author' });
      return;
    }
    
    const contentService = getContentService();
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

// GET /api/content/rag-context - Get content formatted for AI context injection
// Query params: q (optional, used to find relevant tags), limit (optional, default 5)
router.get('/rag-context', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || undefined;
    const limit = parseInt(req.query.limit as string, 10) || 5;
    
    if (isNaN(limit) || limit < 1 || limit > 20) {
      res.status(400).json({ error: 'Limit must be between 1 and 20' });
      return;
    }
    
    const contentService = getContentService();
    const context = contentService.getContextForAI(query, limit);
    
    if (!context || context.trim().length === 0) {
      res.status(404).json({ error: 'No relevant content found' });
      return;
    }
    
    res.json({
      context,
      limit,
      query: query || '',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting RAG context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/tags - Get all unique tags
router.get('/tags', (_req: Request, res: Response) => {
  try {
    const contentService = getContentService();
    const tags = contentService.getAllTags();
    
    res.json({
      tags,
      count: tags.length,
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/content/seed - Seed the content library
router.post('/seed', (_req: Request, res: Response) => {
  try {
    const contentService = getContentService();
    const seeded = contentService.seedContent();
    
    res.status(201).json({
      message: `Content library seeded with ${seeded} items`,
      seeded,
      totalContent: contentService.getContentCount(),
    });
  } catch (error) {
    console.error('Error seeding content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/count - Get total content count
router.get('/count', (_req: Request, res: Response) => {
  try {
    const contentService = getContentService();
    const count = contentService.getContentCount();
    
    res.json({
      count,
    });
  } catch (error) {
    console.error('Error getting content count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
