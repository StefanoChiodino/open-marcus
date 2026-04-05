import { Router } from 'express';
import { getDatabase } from '../db/database.js';

const router = Router();

/**
 * GET /api/export
 * Export all user data as JSON
 */
router.get('/', (_req, res) => {
  const db = getDatabase();
  
  try {
    const profiles = db.listProfiles();
    const sessions = db.listAllSessions();
    
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
 * Import user data from JSON
 */
router.post('/import', (req, res) => {
  const db = getDatabase();
  
  try {
    const data = req.body;
    
    if (!data.version || !data.profiles || !data.sessions || !data.messages || !data.actionItems) {
      return res.status(400).json({ error: 'Invalid export format: missing required fields' });
    }
    
    // Clear existing user data before import
    db.clearAllUserData();
    
    const importResult = db.importData(data);
    
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
 * Clear all user data with confirmation
 */
router.post('/clear', (_req, res) => {
  const db = getDatabase();
  
  try {
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
