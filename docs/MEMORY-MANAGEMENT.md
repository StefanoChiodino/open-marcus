# Memory Management - Token-Based Context Limiting

This document describes how OpenMarcus manages conversation context to prevent memory issues with large language models.

## The Problem

Large language models have a **context window** - a maximum number of tokens they can process in a single request. When sending conversation history:

1. Every message in the history is sent with each request
2. As conversations grow, the request size grows linearly
3. Eventually, the context exceeds the model's limits or consumes excessive memory

## The Solution: Token-Based Hot Buffer

OpenMarcus uses a **token-based hot buffer** approach:

```
Total Token Budget: ~6000 tokens
├── System Prompt Reserve: ~1500 tokens
└── Available for Conversation: ~4500 tokens
    └── Hot Buffer: most recent messages fitting within budget
```

### How It Works

1. **Estimate token count**: Each message is counted as ~4 characters ≈ 1 token
2. **Build hot buffer**: Starting from the most recent message, add messages until the budget is exhausted
3. **Always include last message**: Even if budget is exceeded, the most recent message is always included

### Key Files

- `backend/lib/tokenizer.ts` - Token estimation and hot buffer logic
- `backend/routes/chat.ts` - Uses token-limited context for chat requests
- `backend/services/sessionSummary.ts` - Uses token-limited context for summaries

### Configuration

```typescript
// backend/lib/tokenizer.ts
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  hotBufferTokens: 4000,      // Max tokens for recent conversation
  maxContextTokens: 6000,     // Total limit including system prompt
  systemPromptReserve: 1500,   // Tokens reserved for system prompt
};
```

### Logging

When a chat message is sent, you'll see:
```
[CHAT] Sending 4 messages, ~3500 chars, ~875 tokens
```

## Current Implementation

### Token Estimation

```typescript
// Simple approximation: 4 characters ≈ 1 token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Hot Buffer Selection

```typescript
// Works backwards from most recent, adds messages until budget exceeded
export function getRecentMessagesForTokenBudget<T extends { content: string }>(
  messages: T[],
  maxTokens: number
): T[] {
  const result: T[] = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    
    // Always include at least the last message
    if (result.length === 0) {
      result.unshift(messages[i]);
      totalTokens = msgTokens;
      continue;
    }

    // Check if adding this message would exceed budget
    if (totalTokens + msgTokens <= maxTokens) {
      result.unshift(messages[i]);
      totalTokens += msgTokens;
    } else {
      break;
    }
  }

  return result;
}
```

### Context Building

```typescript
export function buildTokenLimitedContext(
  systemPrompt: string,
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userName: string,
  config: ContextConfig = DEFAULT_CONTEXT_CONFIG
): OllamaMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  const availableTokens = config.maxContextTokens - systemTokens - config.systemPromptReserve;

  // Get messages that fit in hot buffer
  const limitedMessages = getRecentMessagesForTokenBudget(recentMessages, availableTokens);

  const result: OllamaMessage[] = [{ role: 'system', content: systemPrompt }];

  // Handle first message with persona greeting
  const isFirstUserMessage = limitedMessages.length === 1 && limitedMessages[0].role === 'user';
  if (isFirstUserMessage && userName) {
    result.push({ role: 'user', content: `My name is ${userName}.` });
    result.push({ role: 'assistant', content: generateGreeting(userName) });
    result.push({ role: 'user', content: limitedMessages[0].content });
  } else {
    for (const msg of limitedMessages) {
      result.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  return result;
}
```

## Limitations

1. **Simple token estimation**: Uses character count / 4, not a real tokenizer
2. **No long-term memory**: Old conversations are simply dropped
3. **No semantic retrieval**: Can't find relevant past context

## Future Enhancements

See [stoic-emperor Memory System](./STOIC-EMPEROR-MEMORY.md) for a more sophisticated approach with:
- Real tokenizers (tiktoken)
- Conversation condensation (summarization)
- Multi-level hierarchical summaries
- Semantic retrieval
