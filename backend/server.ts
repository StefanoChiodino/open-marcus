import express from 'express';
import { getDatabase } from './db/database.js';
import profileRoutes from './routes/profile.js';
import sessionRoutes from './routes/session.js';
import contentRoutes from './routes/content.js';
import exportRoutes from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/profile', profileRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/export', exportRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function main() {
  try {
    // Initialize database (runs migrations)
    getDatabase();
    console.log('Database initialized');
    
    // Seed content on startup
    const { getContentService } = await import('./services/content.js');
    const contentService = getContentService();
    const seeded = contentService.getContentCount();
    if (seeded === 0) {
      contentService.seedContent();
      console.log(`Stoic content library seeded`);
    } else {
      console.log(`Stoic content library already has ${seeded} items`);
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

export default app;
