# Stoic Emperor Memory System

This document describes the sophisticated memory management system used in [stoic-emperor](https://github.com/stefanomarton/stoic-emperor), a related project that serves as a reference implementation for OpenMarcus.

## Architecture Overview

Stoic Emperor uses a **multi-layered memory system** with:

1. **Hot Buffer** - Recent messages (token-limited)
2. **Condensed Summaries** - Hierarchical summaries of old conversations
3. **Semantic Memory** - Vector-based retrieval of insights
4. **Episodic Memory** - Retrieval of relevant past conversations
5. **Stoic Wisdom** - Vector database of philosophical quotes

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Context Window                        │
├─────────────────────────────────────────────────────────────────┤
│  System Prompt │ Condensed Summaries │ Hot Buffer │ User Input  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. ContextBuilder (`src/memory/context_builder.py`)

The ContextBuilder orchestrates what gets included in the LLM context:

```python
class ContextBuilder:
    def __init__(self, db: Database, config: dict[str, Any]):
        self.tokenizer = tiktoken.encoding_for_model("gpt-4")
        self.hot_buffer_tokens = 4000      # Recent conversation limit
        self.summary_budget_tokens = 12000 # Historical context limit
        self.max_context_tokens = 4000     # Total context window

    def build_context(self, user_id: str, max_tokens: int = None) -> dict:
        # 1. Get recent messages within hot buffer budget
        recent_messages = self._get_hot_buffer(user_id)
        
        # 2. Fill remaining budget with condensed summaries
        summary_budget = max_tokens - recent_tokens
        summaries = self.condensation_manager.get_context_summaries(
            user_id, token_budget=summary_budget
        )
        
        return {
            "recent_messages": recent_messages,
            "condensed_summaries": summaries,
            "total_tokens": ...,
        }
```

### 2. Hot Buffer

The hot buffer contains the most recent messages, limited by token count:

```python
def _get_hot_buffer(self, user_id: str) -> list[Message]:
    all_messages = self.db.get_recent_messages(user_id, limit=100)
    
    hot_buffer = []
    total_tokens = 0
    
    # Work backwards from most recent, adding until budget exhausted
    for msg in reversed(all_messages):
        msg_tokens = self.estimate_tokens(msg.content)
        if total_tokens + msg_tokens <= self.hot_buffer_tokens:
            hot_buffer.insert(0, msg)  # Insert at front to maintain order
            total_tokens += msg_tokens
        else:
            break
    
    return hot_buffer
```

### 3. Condensation Manager (`src/memory/condensation.py`)

Condensation is the process of summarizing old conversations into compact form:

```python
class CondensationManager:
    def __init__(self, db: Database, config: dict[str, Any]):
        self.hot_buffer_tokens = 4000
        self.chunk_threshold_tokens = 8000  # When to trigger condensation
        self.summary_budget_tokens = 12000  # For higher-level summaries
    
    def should_condense(self, user_id: str) -> bool:
        """Check if there are enough uncondensed messages"""
        uncondensed = self.get_uncondensed_messages(user_id)
        total_tokens = sum(self.estimate_tokens(m.content) for m in uncondensed)
        return total_tokens >= self.chunk_threshold_tokens
    
    def condense_chunk(self, user_id: str, messages: list[Message]):
        """Summarize a batch of messages into a Level 1 summary"""
        # Format messages for LLM
        messages_text = "\n\n".join([
            f"[{msg.created_at}] {msg.role.upper()}: {msg.content}"
            for msg in messages
        ])
        
        # Use AI to generate summary
        summary_text = self.llm.generate(
            prompt=f"Summarize this conversation period concisely: {messages_text}"
        )
        
        # Save to database with metadata
        summary = CondensedSummary(
            user_id=user_id,
            level=1,
            content=summary_text,
            period_start=messages[0].created_at,
            period_end=messages[-1].created_at,
            source_message_count=len(messages),
            source_word_count=sum(len(m.split()) for m in messages),
        )
        
        return self.db.save_condensed_summary(summary)
```

### 4. Hierarchical Summaries

Summaries can be recursively condensed into higher levels:

```
Level 1: Summaries of ~50 messages each
Level 2: Summaries of ~5 Level 1 summaries
Level 3: Summaries of ~5 Level 2 summaries
... and so on
```

This creates a **pyramid structure**:

```
                    ┌─────────────┐
                    │   Level 3   │  Very condensed
                    │  (1 summary)│
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Level 2 │      │ Level 2 │      │ Level 2 │
    └────┬────┘      └────┬────┘      └────┬────┘
         │                 │                 │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │ Level 1  │      │ Level 1  │      │ Level 1  │
    └────┬────┘      └────┬────┘      └────┬────┘
         │                 │                 │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │ ~50 msgs│      │ ~50 msgs│      │ ~50 msgs│
    └─────────┘      └─────────┘      └─────────┘
```

### 5. Retrieval System (`src/memory/retrieval.py`)

The UnifiedRetriever fetches relevant context from multiple sources:

```python
class UnifiedRetriever:
    def retrieve(self, user_id: str, session_id: str, user_message: str) -> RetrievalContext:
        # Expand user query for better matching
        expanded_query = self.brain.expand_query(user_message)
        
        # Get recent context for current session
        recent = self.episodic.get_recent_context(session_id, user_message)
        
        # Semantic search across all memory types
        episodic = self.episodic.search_past_conversations(expanded_query)
        insights = self.semantic.get_relevant_insights(expanded_query)
        stoic = self._query_vector_db("stoic_wisdom", expanded_query)
        psych = self._query_vector_db("psychoanalysis", expanded_query)
        
        return RetrievalContext(
            recent_messages=recent,
            episodic_matches=episodic,
            semantic_insights=insights,
            stoic_wisdom=stoic,
            psychoanalysis=psych,
        )
```

### 6. Vector Store (Semantic Memory)

Uses vector embeddings for semantic search:

```python
# Collections:
# - episodic: Past conversation summaries
# - semantic: Extracted insights about the user
# - stoic_wisdom: Philosophical quotes
# - psychoanalysis: Psychological patterns

results = vectors.query(
    collection="semantic",
    query_texts=[expanded_query],
    n_results=5
)
```

## Data Models

### CondensedSummary Schema

```python
class CondensedSummary(BaseModel):
    id: str                    # UUID
    user_id: str               # Owner
    level: int                 # Pyramid level (1, 2, 3, ...)
    content: str               # The summary text
    period_start: datetime     # First message in period
    period_end: datetime       # Last message in period
    source_message_count: int  # How many messages condensed
    source_word_count: int     # Original word count
    source_summary_ids: list   # Parent summaries (for levels > 1)
    consensus_log: dict        # AI consensus metadata (optional)
    created_at: datetime
```

### Message Schema

```python
class Message(BaseModel):
    id: str
    user_id: str
    session_id: str
    role: str                  # "user" or "assistant"
    content: str
    created_at: datetime
```

## Prompt Template for Condensation

```yaml
condensation: |
  Summarize the following conversation period concisely and meaningfully.
  
  Period: {period_start} to {period_end}
  Message count: {message_count}
  Word count: {word_count}
  
  Previous context:
  {previous_context}
  
  Messages:
  {messages}
  
  Provide a 2-3 paragraph summary that captures:
  1. Main themes and topics discussed
  2. Key insights or decisions made
  3. Emotional or philosophical undertones
  
  Write as Marcus Aurelius reflecting on this period.
```

## Token Budget Allocation

Default configuration (adjustable per model):

```python
hot_buffer_tokens = 4000      # Recent conversation
summary_budget_tokens = 12000 # Historical summaries
# Total available for memory:
# max_context_tokens (32000 for GPT-4) - system prompt (~2000) - output (~2000)
# = ~28000 for context

# Example allocation for 32k context:
# System: 2000 tokens
# Output: 2000 tokens  
# Hot buffer: 4000 tokens
# Condensed summaries: 24000 tokens
```

## Condensation Trigger

Condensation is triggered when uncondensed messages exceed the threshold:

```python
chunk_threshold_tokens = 8000  # Start condensing when this much accumulates
```

The `maybe_condense()` method is called after each conversation:

```python
def maybe_condense(self, user_id: str) -> bool:
    if self.should_condense(user_id):
        # Generate Level 1 summary
        self.condense_chunk(user_id, uncondensed_messages)
        
        # Recursively condense if needed
        level = 1
        while level < 10 and self.should_recurse(user_id, level):
            self.condense_summaries(user_id, level)
            level += 1
        
        return True
    return False
```

## Key Differences from OpenMarcus

| Feature | OpenMarcus | Stoic Emperor |
|---------|------------|---------------|
| Token estimation | chars / 4 | tiktoken |
| Context limiting | Token budget | Token budget |
| Long-term memory | None (messages dropped) | Condensed summaries |
| Summary hierarchy | None | Multi-level pyramid |
| Semantic retrieval | None | Vector store (ChromaDB) |
| Query expansion | None | LLM-based |
| Consensus protocol | None | Dual-model verification |

## Implementation Status

OpenMarcus currently implements:
- ✅ Token-based hot buffer
- ✅ System prompt limiting
- ❌ Condensation (summarization)
- ❌ Hierarchical summaries
- ❌ Vector-based retrieval
- ❌ Semantic memory

## Future Enhancement Path

To implement full stoic-emperor style memory in OpenMarcus:

1. **Add tiktoken** for accurate token counting
2. **Create condensed_summaries table** in SQLite
3. **Implement CondensationManager** service
4. **Add condensation trigger** after sessions
5. **Implement recursive condensation** for hierarchy
6. **Add vector store** (SQLite vec or similar)
7. **Implement retrieval** combining all memory types
