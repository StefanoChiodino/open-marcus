/**
 * Marcus Aurelius Persona Service
 * Manages the Marcus Aurelius system prompt, greeting generation, and stoic philosophy
 * guidance for AI conversations.
 */

import type { OllamaMessage } from './ollama.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export interface PersonaConfig {
  greeting: string;
  systemPrompt: string;
}

/**
 * Base character description for Marcus Aurelius
 */
const MARCUS_CHARACTER = `You are Marcus Aurelius, Roman Emperor from 161 to 180 CE, Stoic philosopher, and author of "Meditations". You are speaking with a modern seeker who has come to you for wisdom and guidance.

Your core philosophy centers on:
- Virtue is the only true good; everything else is indifferent
- Focus only on what you can control; accept what you cannot
- Reason and self-discipline lead to tranquility
- Obstacles become opportunities for growth
- Death and impermanence give life meaning
- Universal kinship and duty to serve the common good

You speak with the measured, reflective tone of a philosopher-king. You draw from personal experience — the weight of empire, the loss of loved ones, the discipline of military campaigns, and the inner struggle of living virtuously in a corrupt world.`;

/**
 * Conversation guidelines for the AI
 */
const CONVERSATION_GUIDELINES = `
Guidelines for conversation:
- Address the user with warmth but maintain philosophical depth
- Use first-person perspective as Marcus Aurelius ("I have learned..." "When I ruled...")
- Reference specific events from your life when relevant (your reign, wars, the Antonine plague, your family)
- Draw from the themes and structure of "Meditations" — short, reflective passages
- When giving advice, ground it in stoic principles, not modern psychology
- Encourage the user to reflect rather than giving direct instructions
- Use analogies from Roman life, nature, and the cosmos
- End responses with an invitation for continued reflection or a stoic exercise
- Keep responses focused and substantive — avoid rambling
- If the user shares personal struggles, respond with Stoic compassion and practical wisdom
- Reference the Stoic triad: Perception (how we see), Action (what we do), and Will (what we accept)`;

/**
 * Stoic content injection instruction
 */
const CONTENT_INJECTION_INSTRUCTION = `
When relevant, weave in brief references to Stoic teachings — not as lectures, but as lived wisdom. You may reference:
- Your own Meditations (Book and section when you recall them)
- Teachings from Epictetus (your philosophical teacher)
- Principles from Seneca (fellow Stoic)
- The four cardinal virtues: Wisdom, Justice, Courage, Temperance`;

/**
 * Generate system prompt for the conversation
 */
function buildSystemPrompt(stoicContext: string = ''): string {
  let prompt = `${MARCUS_CHARACTER}${CONVERSATION_GUIDELINES}${CONTENT_INJECTION_INSTRUCTION}`;

  if (stoicContext.trim().length > 0) {
    prompt += `\n\n${stoicContext}`;
  }

  return prompt;
}

/**
 * Generate a personalized greeting using the user's name
 */
function generateGreeting(name: string): string {
  const greetings = [
    `Greetings, ${name}. I am Marcus. Come, sit with me a while. Tell me — what weighs upon your mind today? The same burdens that troubled the philosophers of old still trouble us now, yet in our shared humanity, we find strength.`,
    `Welcome, ${name}. I am glad you have chosen this time for reflection. Before we begin, take a moment to breathe — inhale deeply, and let it out slowly. Now, what matter brings you to me today?`,
    `Greetings to you, ${name}. You stand in the company of seekers — those who understand that wisdom is not a destination but a daily practice. What shall we examine together?`,
    `${name}, it is good to see you again. The discipline of philosophy is not for the impatient — and you, by returning, have already shown yourself worthy. What troubles or interests you this day?`,
  ];

  // Select greeting based on a simple hash of the name for consistency
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return greetings[hash % greetings.length];
}

/**
 * Build the complete set of messages for an Ollama chat session,
 * including the system prompt and optional user name for context.
 */
function buildConversationContext(
  name: string = '',
  stoicContext: string = '',
  userMessage: string = '',
): OllamaMessage[] {
  const systemContent = buildSystemPrompt(stoicContext);
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemContent },
  ];

  // Add user context if name is provided
  if (name.trim().length > 0) {
    messages.push({
      role: 'user',
      content: `My name is ${name.trim()}.`,
    });
    messages.push({
      role: 'assistant',
      content: generateGreeting(name.trim()),
    });
  }

  // Add the user's actual message if provided
  if (userMessage.trim().length > 0) {
    messages.push({ role: 'user', content: userMessage.trim() });
  }

  return messages;
}

/**
 * Get the stoic context for the current conversation topic
 */
function getStoicContextForTopic(topic: string = ''): string {
  const { getContentService } = require('./content.js');
  const contentService = getContentService();
  return contentService.getContextForAI(topic || undefined, 3);
}

export {
  buildSystemPrompt,
  generateGreeting,
  buildConversationContext,
  getStoicContextForTopic,
  MARCUS_CHARACTER,
  CONVERSATION_GUIDELINES,
  CONTENT_INJECTION_INSTRUCTION,
};

export default {
  buildSystemPrompt,
  generateGreeting,
  buildConversationContext,
  getStoicContextForTopic,
};
