import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { getProfileService } from '../services/profile.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

// Validation error class (duplicated here to avoid circular dependency issues)
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const router = Router();

// GET /api/profile - Get current profile (for authenticated user)
router.get('/', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const profileService = getProfileService();
    const profile = profileService.getCurrentProfileByUserId(userId);
    
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
router.post('/', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { name, bio } = req.body;
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    
    const profileService = getProfileService();
    const profile = profileService.createProfileForUser(userId, name.trim(), bio || null);
    
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
router.put('/', (req: Request, res: Response) => {
  try {
    const { id, name, bio } = req.body;
    
    if (!id) {
      res.status(400).json({ error: 'Profile ID is required' });
      return;
    }
    
    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    
    const db = getDatabase();
    const profile = db.updateProfile(id, name.trim(), bio || null);
    
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
router.delete('/', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      res.status(400).json({ error: 'Profile ID is required' });
      return;
    }
    
    const db = getDatabase();
    const deleted = db.deleteProfile(id);
    
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

export default router;
