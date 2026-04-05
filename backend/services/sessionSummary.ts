/**
 * Session Summary Service
 * Generates session summaries and extracts action items from conversations
 * using the Marcus Aurelius persona and Ollama AI.
 */

import type { OllamaService } from './ollama.js';
import type { SessionService } from './session.js';
import type { ProfileService } from './profile.js';
import type { Message } from '../db/schema.js';

export interface SessionSummaryResult {
  summary: string;
  actionItems: string[];
}

/**
 * Prompt template for generating session summaries
 */
const SUMMARY_PROMPT_TEMPLATE = `{userName}

Review the conversation below and compose:
1. A brief summary (2-3 paragraphs) of the main themes discussed and wisdom shared
2. A list of specific action items or commitments the seeker made or should consider

Write the summary in first person as Marcus. Be reflective and insightful, as if writing in your Meditations.

For action items, extract them from the conversation. These should be concrete, actionable commitments. Format each as a brief imperative statement.

---
Conversation:
{conversationHistory}

---
Format your response EXACTLY as follows — a JSON object with no other text:
{"summary":"Your reflective summary here...","actionItems":["First action item","Second action item"]}
`;

/**
 * Prompt template for extracting action items from conversation
 */
const ACTION_ITEMS_PROMPT_TEMPLATE = `Based on the conversation with {userName} below, extract the key action items or commitments that were discussed or that would benefit the seeker.

These should be:
- Concrete and actionable (not vague aspirations)
- Related to Stoic practice (reflection, self-improvement, virtue)
- Between 2-5 items

---
Conversation:
{conversationHistory}

---
Respond ONLY with a JSON array of strings, one per action item:
["Action item 1", "Action item 2", "Action item 3"]
`;

export class SessionSummaryService {
  private _ollamaService?: OllamaService;
  private _sessionService?: SessionService;
  private _profileService?: ProfileService;

  constructor(ollamaService?: OllamaService, sessionService?: SessionService, profileService?: ProfileService) {
    this._ollamaService = ollamaService;
    this._sessionService = sessionService;
    this._profileService = profileService;
  }

  private async getOllamaService(): Promise<OllamaService> {
    if (!this._ollamaService) {
      const { getOllamaService: _fn } = await import('./ollama.js');
      this._ollamaService = _fn();
    }
    return this._ollamaService;
  }

  private async getSessionService(): Promise<SessionService> {
    if (!this._sessionService) {
      const { getSessionService: _fn } = await import('./session.js');
      this._sessionService = _fn();
    }
    return this._sessionService;
  }

  private async getProfileService(): Promise<ReturnType<typeof import('./profile.js').getProfileService>> {
    if (this._profileService) {
      return this._profileService;
    }
    const { ProfileService } = await import('./profile.js');
    const { getDatabase } = await import('../db/database.js');
    const db = getDatabase();
    return new ProfileService(() => db);
  }

  private async getBuildSystemPrompt(): Promise<(stoicContext?: string) => string> {
    const { buildSystemPrompt } = await import('./persona.js');
    return buildSystemPrompt;
  }

  /**
   * Generate a summary and extract action items from a session's conversation
   */
  async generateSummary(sessionId: string): Promise<SessionSummaryResult> {
    const sessionService = await this.getSessionService();
    const session = sessionService.getSessionWithoutMessages(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const profileService = await this.getProfileService();
    const profile = profileService.getProfile(session.profile_id);
    const userName = profile?.name || 'seeker';

    const messages = sessionService.listMessages(sessionId);

    if (messages.length === 0) {
      return {
        summary: `A quiet moment of reflection with ${userName}. Sometimes silence speaks louder than words.`,
        actionItems: ['Take time for quiet reflection daily'],
      };
    }

    const conversationHistory = formatConversation(messages, userName);
    const prompt = SUMMARY_PROMPT_TEMPLATE
      .replace('{userName}', userName)
      .replace('{conversationHistory}', conversationHistory);

    try {
      const buildSystemPrompt = await this.getBuildSystemPrompt();
      const systemContent = buildSystemPrompt();
      const ollamaService = await this.getOllamaService();
      const response = await ollamaService.chat([
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ]);

      const content = response.message.content;
      return this.parseSummaryResponse(content);
    } catch (error) {
      console.error('Failed to generate session summary:', error);
      return generateFallbackSummary(messages, userName);
    }
  }

  /**
   * Extract action items from a session's conversation
   */
  async extractActionItems(sessionId: string): Promise<string[]> {
    const sessionService = await this.getSessionService();
    const session = sessionService.getSessionWithoutMessages(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const profileService = await this.getProfileService();
    const profile = profileService.getProfile(session.profile_id);
    const userName = profile?.name || 'seeker';

    const messages = sessionService.listMessages(sessionId);

    if (messages.length === 0) {
      return ['Take time for quiet reflection daily'];
    }

    const conversationHistory = formatConversation(messages, userName);
    const prompt = ACTION_ITEMS_PROMPT_TEMPLATE
      .replace('{userName}', userName)
      .replace('{conversationHistory}', conversationHistory);

    try {
      const buildSystemPrompt = await this.getBuildSystemPrompt();
      const systemContent = buildSystemPrompt();
      const ollamaService = await this.getOllamaService();
      const response = await ollamaService.chat([
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ]);

      const content = response.message.content;
      return this.parseActionItemsResponse(content);
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return ['Take time for quiet reflection daily'];
    }
  }

  /**
   * Parse the summary response from Ollama
   */
  private parseSummaryResponse(content: string): SessionSummaryResult {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return {
        summary: parsed.summary || 'A meaningful conversation took place.',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch {
      return {
        summary: content.substring(0, 500),
        actionItems: [],
      };
    }
  }

  /**
   * Parse the action items response from Ollama
   */
  private parseActionItemsResponse(content: string): string[] {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
}

/**
 * Format conversation messages into a readable string
 */
function formatConversation(messages: Message[], _userName?: string): string {
  return messages
    .map(msg => {
      const speaker = msg.role === 'user' ? 'Seeker' : 'Marcus';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * Generate a fallback summary when AI generation fails
 */
function generateFallbackSummary(messages: Message[], userName: string): SessionSummaryResult {
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const firstFewWords = lastUserMessage
    ? lastUserMessage.content.split(' ').slice(0, 5).join(' ') + '...'
    : 'various topics';

  return {
    summary: `A conversation with ${userName} touching on ${firstFewWords}. We exchanged ${userMessageCount} messages from the seeker and ${assistantMessageCount} reflections from Marcus.`,
    actionItems: ['Take time for quiet reflection daily'],
  };
}

// Singleton instance
let sessionSummaryServiceInstance: SessionSummaryService | null = null;

export function getSessionSummaryService(
  ollamaService?: OllamaService,
  sessionService?: SessionService,
  profileService?: ProfileService,
): SessionSummaryService {
  if (!sessionSummaryServiceInstance) {
    sessionSummaryServiceInstance = new SessionSummaryService(ollamaService, sessionService, profileService);
  }
  return sessionSummaryServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSessionSummaryService(): void {
  sessionSummaryServiceInstance = null;
}
