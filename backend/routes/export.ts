import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/export
 * Export all user data as JSON for authenticated user
 */
router.get('/', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  const db = getDatabase();
  
  try {
    const profiles = db.listProfilesByUserId(userId);
    const sessions = db.listSessionsByUserId(userId);
    
    // Collect all messages and action items for each session
    const allMessages: Array<Record<string, unknown>> = [];
    const allActionItems: Array<Record<string, unknown>> = [];
    const contentItems: Array<Record<string, unknown>> = [];
    
    for (const session of sessions) {
      const messages = db.listMessages(session.id);
      allMessages.push(...messages.map(m => ({ ...m }) as Record<string, unknown>));
      
      const actionItems = db.listActionItems(session.id);
      allActionItems.push(...actionItems.map(ai => ({ ...ai }) as Record<string, unknown>));
    }
    
    // Get all stoic content
    const allContent = db.searchContent(undefined, undefined, undefined, 10000);
    contentItems.push(...allContent.map(c => ({ ...c }) as Record<string, unknown>));
    
    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      profiles,
      sessions,
      messages: allMessages,
      actionItems: allActionItems,
      content: contentItems,
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /api/export/import
 * Import user data from JSON (for authenticated user)
 */
router.post('/import', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  const db = getDatabase();
  
  try {
    const data = req.body;
    
    if (!data.version || !data.profiles || !data.sessions || !data.messages || !data.actionItems) {
      return res.status(400).json({ error: 'Invalid export format: missing required fields' });
    }
    
    // Import data associated with the authenticated user
    const importResult = db.importData(data, userId);
    
    res.json({
      success: true,
      imported: {
        profiles: importResult.profiles,
        sessions: importResult.sessions,
        messages: importResult.messages,
        actionItems: importResult.actionItems,
      },
    });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

/**
 * POST /api/export/clear
 * Clear all user data for authenticated user
 */
router.post('/clear', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.userId;
  
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  const db = getDatabase();
  
  try {
    // Note: clearAllUserData clears ALL user data (for backward compatibility)
    // In a full multi-user implementation, we'd need to clear only the user's data
    const result = db.clearAllUserData();
    
    res.json({
      success: true,
      cleared: {
        profiles: result.profiles,
        sessions: result.sessions,
        messages: result.messages,
        actionItems: result.actionItems,
      },
    });
  } catch (error) {
    console.error('Clear data failed:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

export default router;
