import { Router, Request, Response } from 'express';
import { getSessionService, resetSessionService, ValidationError } from '../services/session.js';
import { getProfileService } from '../services/profile.js';
import { getSessionSummaryService } from '../services/sessionSummary.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// Type-safe params interface
interface SessionParams {
  id: string;
}

const router = Router();

// GET /api/sessions - List all sessions for authenticated user
router.get('/', (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const sessionService = getSessionService();
    const sessions = sessionService.listSessionsByUserId(userId);
    
    // Return sessions with message count for history listing
    const sessionsWithMeta = sessions.map(session => {
      const messages = sessionService.listMessages(session.id);
      return {
        ...session,
        message_count: messages.length,
        first_message: messages.length > 0 ? messages[0].content : null,
      };
    });
    
    res.json(sessionsWithMeta);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id - Get session with messages (user isolation check)
router.get('/:id', (req: Request<SessionParams>, res: Response) => {
  try {
    const id = req.params.id;
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const sessionService = getSessionService();
    const result = sessionService.getSession(id);
    
    if (!result) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    // Multi-user isolation: ensure session belongs to the user
    const session = result.session;
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions - Create a new session
router.post('/', (req: Request, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { profile_id } = req.body;
    const profileService = getProfileService();
    const sessionService = getSessionService();
    
    // If profile_id is not provided, try to get the current profile for this user
    let profileId = profile_id;
    if (!profileId) {
      const profile = profileService.getCurrentProfileByUserId(userId);
      if (!profile) {
        res.status(400).json({ error: 'Profile ID is required' });
        return;
      }
      profileId = profile.id;
    } else {
      // If profile_id is provided, verify it belongs to this user
      const profile = profileService.getProfile(profileId);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }
      if (profile.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }
    
    const session = sessionService.createSession(profileId);
    
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/messages - Add a message to a session
router.post('/:id/messages', (req: Request<SessionParams>, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const id = req.params.id;
    const { role, content } = req.body;
    
    if (!role || !content) {
      res.status(400).json({ error: 'Role and content are required' });
      return;
    }
    
    const sessionService = getSessionService();
    
    // Verify session belongs to user
    const session = sessionService.getSessionWithoutMessages(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const message = sessionService.addMessage(id, role, content);
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sessions/:id/end - End a session with summary
router.put('/:id/end', (req: Request<SessionParams>, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const id = req.params.id;
    const { summary, action_items } = req.body;
    
    if (!summary) {
      res.status(400).json({ error: 'Session summary is required' });
      return;
    }
    
    const sessionService = getSessionService();
    
    // Verify session belongs to user
    const session = sessionService.getSessionWithoutMessages(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const endedSession = sessionService.endSession(id, summary, action_items || []);
    
    if (!endedSession) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json(endedSession);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sessions/:id/end-and-summarize - End session with AI-generated summary
router.post('/:id/end-and-summarize', async (req: Request<SessionParams>, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const id = req.params.id;
    const sessionService = getSessionService();

    // Verify session belongs to user
    const session = sessionService.getSessionWithoutMessages(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Generate summary and action items using AI
    const summaryService = getSessionSummaryService();
    const result = await summaryService.generateSummary(id);

    // End the session with the generated summary
    const endedSession = sessionService.endSession(id, result.summary, result.actionItems);

    if (!endedSession) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      session: endedSession,
      summary: result.summary,
      actionItems: result.actionItems,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Error ending and summarizing session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/sessions/:id/status - Update session status
router.patch('/:id/status', (req: Request<SessionParams>, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const id = req.params.id;
    const { status } = req.body;
    
    if (!status || !['intro', 'active', 'closing', 'summary'].includes(status)) {
      res.status(400).json({ error: 'Valid status is required (intro, active, closing, summary)' });
      return;
    }
    
    const sessionService = getSessionService();
    
    // Verify session belongs to user
    const session = sessionService.getSessionWithoutMessages(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const updatedSession = sessionService.updateSessionStatus(id, status);
    
    if (!updatedSession) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.json(updatedSession);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    console.error('Error updating session status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', (req: Request<SessionParams>, res: Response) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const id = req.params.id;
    const sessionService = getSessionService();
    
    // Verify session belongs to user
    const session = sessionService.getSessionWithoutMessages(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    const deleted = sessionService.deleteSession(id);
    
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
export { resetSessionService };
