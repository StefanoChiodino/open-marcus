import { Router, Request, Response } from 'express';
import { getOllamaService, OllamaOfflineError } from '../services/ollama.js';
import { getSessionService } from '../services/session.js';

const router = Router();

/**
 * POST /api/chat
 *
 * Sends a message to the AI (Ollama) and streams the response.
 *
 * Request body:
 *   - session_id: string (required) - The session UUID
 *   - message: string (required) - The user's message
 *
 * Response (streaming, ndjson):
 *   - Each line: { "token": "..." }
 *   - Final line: { "done": true, "full_response": "..." }
 *
 * Error responses:
 *   - 400: Missing session_id or message
 *   - 404: Session not found
 *   - 503: Ollama is not running
 *   - 500: Internal server error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { session_id, message } = req.body;

    // Validate request body
    if (!session_id || !message) {
      res.status(400).json({ error: 'session_id and message are required' });
      return;
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message must be a non-empty string' });
      return;
    }

    const ollamaService = getOllamaService();
    const sessionService = getSessionService();

    // Verify session exists
    const session = sessionService.getSessionWithoutMessages(session_id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Save user message to database
    sessionService.addMessage(session_id, 'user', message.trim());

    // Check if Ollama is online before starting stream
    const isOnline = await ollamaService.isOnline();
    if (!isOnline) {
      res.status(503).json({
        error: 'Unable to connect to AI. Please ensure Ollama is running.',
      });
      return;
    }

    // Build conversation history for Ollama
    const history = sessionService.listMessages(session_id);
    const messages = history.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));
    // The user message was already added to DB, so it's in history

    // Set up streaming response headers
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Stream the response
    let fullResponse = '';

    try {
      for await (const token of ollamaService.streamChat(messages)) {
        fullResponse += token;
        // Write token as ndjson
        res.write(JSON.stringify({ token }) + '\n');
      }

      // Save assistant response
      if (fullResponse.trim().length > 0) {
        sessionService.addMessage(session_id, 'assistant', fullResponse);
      }

      // Send completion marker
      res.write(JSON.stringify({ done: true, full_response: fullResponse.trim() }) + '\n');
      res.end();
    } catch (streamError) {
      // If streaming fails
      console.error('Streaming error:', streamError);
      const errMsg = streamError instanceof Error ? streamError.message : 'Streaming failed';

      // If we've already started streaming, we can't send a 503
      // But we can send an error token and close
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Unable to connect to AI. Please ensure Ollama is running.',
        });
      } else {
        res.write(JSON.stringify({ error: errMsg }) + '\n');
        res.end();
      }
    }
  } catch (error) {
    // Only send error if headers haven't been sent
    if (!res.headersSent) {
      console.error('Error in chat endpoint:', error);
      if (error instanceof OllamaOfflineError) {
        res.status(503).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
});

export default router;
