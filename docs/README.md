# Documentation

## Memory Management

These documents describe how OpenMarcus manages conversation context and memory:

### [Memory Management](./MEMORY-MANAGEMENT.md)
Describes the current implementation in OpenMarcus:
- Token-based hot buffer approach
- How context is built and limited
- Current configuration
- Limitations

### [Stoic Emperor Memory System](./STOIC-EMPEROR-MEMORY.md)
Reference implementation from the related [stoic-emperor](https://github.com/stefanomarton/stoic-emperor) project:
- Multi-layered memory architecture
- Hot buffer
- Conversation condensation (summarization)
- Hierarchical summaries (pyramid structure)
- Vector-based semantic retrieval
- Data models and schemas
- Future enhancement path for OpenMarcus

## Quick Comparison

| Feature | OpenMarcus (Current) | Stoic Emperor (Reference) |
|---------|---------------------|---------------------------|
| Context limit | 6000 tokens | 28000 tokens |
| Token counting | char / 4 | tiktoken |
| Historical memory | ❌ Messages dropped | ✅ Condensed summaries |
| Summary hierarchy | ❌ None | ✅ Multi-level pyramid |
| Semantic search | ❌ None | ✅ Vector embeddings |

## Reading Order

1. Start with [MEMORY-MANAGEMENT.md](./MEMORY-MANAGEMENT.md) to understand what OpenMarcus does now
2. Read [STOIC-EMPEROR-MEMORY.md](./STOIC-EMPEROR-MEMORY.md) for the full reference implementation
3. The latter document includes an "Implementation Status" section showing what's missing in OpenMarcus
