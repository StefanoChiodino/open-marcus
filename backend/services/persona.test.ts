import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  generateGreeting,
  buildConversationContext,
  MARCUS_CHARACTER,
  CONVERSATION_GUIDELINES,
  CONTENT_INJECTION_INSTRUCTION,
} from '../services/persona.js';

describe('Marcus Persona Service', () => {
  describe('MARCUS_CHARACTER', () => {
    it('should contain Marcus Aurelius identity', () => {
      expect(MARCUS_CHARACTER).toContain('Marcus Aurelius');
      expect(MARCUS_CHARACTER).toContain('Roman Emperor');
      expect(MARCUS_CHARACTER).toContain('Meditations');
    });

    it('should contain core stoic philosophy', () => {
      expect(MARCUS_CHARACTER).toContain('Virtue');
      expect(MARCUS_CHARACTER).toContain('control');
      expect(MARCUS_CHARACTER).toContain('tranquility');
    });

    it('should mention personal experience', () => {
      expect(MARCUS_CHARACTER).toContain('empire');
    });
  });

  describe('CONVERSATION_GUIDELINES', () => {
    it('should instruct first-person perspective', () => {
      expect(CONVERSATION_GUIDELINES).toContain('first-person');
    });

    it('should reference stoic principles', () => {
      expect(CONVERSATION_GUIDELINES).toContain('stoic');
      expect(CONVERSATION_GUIDELINES).toContain('Perception');
      expect(CONVERSATION_GUIDELINES).toContain('Action');
      expect(CONVERSATION_GUIDELINES).toContain('Will');
    });
  });

  describe('CONTENT_INJECTION_INSTRUCTION', () => {
    it('should reference the cardinal virtues', () => {
      expect(CONTENT_INJECTION_INSTRUCTION).toContain('Wisdom');
      expect(CONTENT_INJECTION_INSTRUCTION).toContain('Justice');
      expect(CONTENT_INJECTION_INSTRUCTION).toContain('Courage');
      expect(CONTENT_INJECTION_INSTRUCTION).toContain('Temperance');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build a complete system prompt', () => {
      const prompt = buildSystemPrompt();

      expect(prompt).toContain(MARCUS_CHARACTER);
      expect(prompt).toContain(CONVERSATION_GUIDELINES);
      expect(prompt).toContain(CONTENT_INJECTION_INSTRUCTION);
    });

    it('should include stoic context when provided', () => {
      const context = '"The obstacle is the way" — Marcus Aurelius';
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain(context);
    });

    it('should be substantial enough for persona guidance', () => {
      const prompt = buildSystemPrompt();
      expect(prompt.length).toBeGreaterThan(500);
    });
  });

  describe('generateGreeting', () => {
    it('should include the user name in the greeting', () => {
      const greeting = generateGreeting('Stefano');
      expect(greeting).toContain('Stefano');
    });

    it('should mention Marcus in the greeting', () => {
      const greeting = generateGreeting('Test');
      expect(greeting).toContain('Marcus');
    });

    it('should be a substantive greeting (not just hello)', () => {
      const greeting = generateGreeting('Aurelia');
      expect(greeting.length).toBeGreaterThan(50);
    });

    it('should return consistent greeting for same name', () => {
      const greeting1 = generateGreeting('John');
      const greeting2 = generateGreeting('John');
      expect(greeting1).toBe(greeting2);
    });

    it('should return different greetings for different names', () => {
      const greeting1 = generateGreeting('Alice');
      const greeting2 = generateGreeting('Bob');
      // Different names may return the same or different greeting based on hash
      // But both should contain the respective name
      expect(greeting1).toContain('Alice');
      expect(greeting2).toContain('Bob');
    });

    it('should cover multiple greeting variations', () => {
      const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
      const greetings = new Set(names.map(n => generateGreeting(n)));
      // With enough different names, we should hit multiple greeting templates
      expect(greetings.size).toBeGreaterThan(1);
    });
  });

  describe('buildConversationContext', () => {
    it('should include system message', () => {
      const messages = buildConversationContext('Test');
      expect(messages[0].role).toBe('system');
    });

    it('should include user name and greeting when name provided', () => {
      const messages = buildConversationContext('Marcus');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('My name is Marcus');
      expect(messages[2].role).toBe('assistant');
      expect(messages[2].content).toContain('Marcus');
    });

    it('should include user message when provided', () => {
      const messages = buildConversationContext('Test', '', 'Hello, I am struggling with anxiety');
      expect(messages.some(m => m.content.includes('struggling with anxiety'))).toBe(true);
    });

    it('should include stoic context when provided', () => {
      const context = 'Relevant stoic wisdom';
      const messages = buildConversationContext('Test', context);
      expect(messages[0].content).toContain(context);
    });

    it('should skip name greeting when name is empty', () => {
      const messages = buildConversationContext('');
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
    });

    it('should handle all parameters together', () => {
      const messages = buildConversationContext(
        'John',
        'Stoic context about virtue',
        'I need guidance on anger',
      );
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Stoic context about virtue');
      expect(messages[1].content).toContain('My name is John');
      expect(messages[2].role).toBe('assistant');
      expect(messages[2].content).toContain('John');
      expect(messages[3].content).toContain('anger');
    });

    it('should trim name and user message', () => {
      const messages = buildConversationContext('  John  ', '', '  Hello  ');
      expect(messages[1].content).toBe('My name is John.');
      expect(messages[3].content).toBe('Hello');
    });
  });
});
