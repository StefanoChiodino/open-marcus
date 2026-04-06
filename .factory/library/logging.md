# Development Logging Architecture

## Overview

OpenMarcus uses a **development-only, file-based logging system** designed for LLM agent observability and debugging. Production has zero logging overhead.

## Core Principle

**Log files are for machines, not humans.** Structured JSON Lines format enables easy parsing by debugging agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Code                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Auth    │  │ API      │  │ Database │  │ Error       │ │
│  │ Service │  │ Routes   │  │ Service  │  │ Handler     │ │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │             │             │                │        │
│       ▼             ▼             ▼                ▼        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              DevLogger Utility                       │  │
│  │  - isProduction() check                               │  │
│  │  - getCorrelationId()                                │  │
│  │  - JSON Lines formatting                             │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            ./data/logs/*.log                         │  │
│  │  auth.log | api.log | db.log | error.log | app.log   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Log Entry Format

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Database query executed",
  "context": {
    "queryType": "SELECT",
    "table": "messages",
    "durationMs": 2,
    "rowsReturned": 5
  }
}
```

## Correlation IDs

Every request gets a unique correlation ID that appears in ALL log entries for that request:
- Auth logs
- API request/response logs
- Database query logs
- Error logs

This enables tracing a single request across all layers.

## Safety Guarantees

1. **No Message Content**: Database query logging explicitly excludes `content` columns from messages table
2. **Header Redaction**: Authorization and Cookie headers are redacted in API logs
3. **Sensitive Field Filtering**: Passwords, tokens never appear in logs
4. **Production Safety**: All logging code wrapped with `if (!isProduction())` - completely stripped in production builds

## File Descriptions

| File | Contents | Correlation ID |
|------|----------|-----------------|
| `auth.log` | Login attempts, logout, session events, auth errors | Yes |
| `api.log` | HTTP method, path, query params, status code, duration | Yes |
| `db.log` | SQL queries, transaction boundaries, timing | Yes |
| `error.log` | Stack traces, unhandled exceptions, 500 errors | Yes |
| `app.log` | General app events, startup, shutdown | No |

## Implementation Notes

- Logger uses `fs.appendFileSync` for simplicity (no external dependencies)
- Files created automatically in `./data/logs/` directory
- No rotation implemented (LLM agents can tail/scan as needed)
- All times in UTC ISO format
