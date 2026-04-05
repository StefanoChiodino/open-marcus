---
name: backend-worker
description: Node.js/Express backend development for OpenMarcus
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve API endpoints, database operations, Ollama integration, server-side logic, or any Node.js services.

## Required Skills

- None required for backend-only features
- `agent-browser` for integration testing if frontend components needed

## Work Procedure

1. **Read Mission Context**
   - Read `mission.md` and `AGENTS.md` for mission requirements
   - Read relevant sections of `validation-contract.md` for testable behaviors
   - Review existing API patterns in the codebase

2. **Write Tests First (TDD)**
   - Write failing unit tests for the service/route before implementation
   - Tests must verify:
     - Endpoint returns correct status codes
     - Request validation works
     - Data persistence works
     - Error handling works

3. **Implement Feature**
   - Follow existing Express patterns
   - Use TypeScript strict mode
   - Implement proper error handling
   - Add request validation
   - Document API endpoints

4. **Verify Implementation**
   - Run `npm run typecheck` - must pass
   - Run `npm run lint` - must pass
   - Run unit tests - all must pass
   - Manual API testing with curl:
     - Happy path requests
     - Error cases
     - Edge cases

5. **Commit with Evidence**
   - Include test output and curl examples in handoff
   - Document any new environment variables needed

## Example Handoff

```json
{
  "salientSummary": "Implemented session management API with CRUD operations, message storage, and Ollama streaming. All tests pass. API verified with curl showing correct status codes and streaming behavior.",
  "whatWasImplemented": "Created session routes (create, get, list, end), message storage service, streaming chat endpoint that proxies to Ollama. Implemented session state machine (intro, active, closing, summary).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run typecheck", "exitCode": 0, "observation": "TypeScript compilation successful" },
      { "command": "npm run test -- --grep 'SessionService'", "exitCode": 0, "observation": "8 tests passing" },
      { "command": "curl -X POST http://localhost:3100/api/sessions", "exitCode": 0, "observation": "Returns session ID" }
    ],
    "interactiveChecks": [
      { "action": "POST /api/sessions - create session", "observed": "201 with session ID" },
      { "action": "GET /api/sessions - list sessions", "observed": "200 with array of sessions" },
      { "action": "POST streaming chat - verify stream", "observed": "ndjson stream with tokens" }
    ]
  },
  "tests": {
    "added": [
      { "file": "src/backend/services/session.test.ts", "cases": ["createSession", "getSession", "listSessions", "endSession", "persistMessages"] },
      { "file": "src/backend/routes/session.test.ts", "cases": ["create 201", "get 404", "validation error"] }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on database schema that doesn't exist
- Requirements are ambiguous or contradictory
- Existing bugs affect this feature
- Need clarification on API design
- Ollama connectivity issues
