import { Router, Request, Response } from 'express';
import { getOllamaService, OllamaOfflineError } from '../services/ollama.js';
import { getSessionService } from '../services/session.js';
import { getProfileService } from '../services/profile.js';
import { buildSystemPrompt, generateGreeting } from '../services/persona.js';
import { getSettingsService } from '../services/settings.js';

const router = Router();

/**
 * POST /api/chat
 *
 * Sends a message to the AI (Ollama) and streams the response.
 * The Marcus Aurelius persona is injected as a system message.
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
    const profileService = getProfileService();

    // Load selected model from settings and update OllamaService
    const settingsService = getSettingsService();
    const settings = settingsService.getSettings();
    if (ollamaService.getModel() !== settings.selectedModel) {
      ollamaService.setModel(settings.selectedModel);
    }

    // Verify session exists
    const session = sessionService.getSessionWithoutMessages(session_id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Auto-transition from intro to active on first message
    if (session.status === 'intro') {
      sessionService.updateSessionStatus(session_id, 'active');
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

    // Get user name from profile for persona context
    const profile = profileService.getProfile(session.profile_id);
    const userName = profile?.name || '';

    // Build conversation history for Ollama with persona system prompt
    const history = sessionService.listMessages(session_id);
    const messages = buildChatMessages(history, userName);

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

/**
 * Build the message array for Ollama including persona system prompt.
 * On first user message, prefix with name disclosure and greeting.
 */
function buildChatMessages(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userName: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemMessage = { role: 'system' as const, content: buildSystemPrompt() };

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [systemMessage];

  // If this is the first user message, inject persona greeting
  const isFirstUserMessage = history.length === 1 && history[0]?.role === 'user';
  if (isFirstUserMessage && userName) {
    messages.push({ role: 'user', content: `My name is ${userName}.` });
    messages.push({ role: 'assistant', content: generateGreeting(userName) });
    // Now add the actual user message
    messages.push({ role: 'user', content: history[0].content });
  } else {
    // Regular conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  return messages;
}

export default router;
