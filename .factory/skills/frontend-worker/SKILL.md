---
name: frontend-worker
description: React/TypeScript frontend development for OpenMarcus
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve React components, UI design, CSS styling, client-side state management, or browser-based interactions.

## Required Skills

- `agent-browser`: For UI validation and screenshot evidence

## Work Procedure

1. **Read Mission Context**
   - Read `mission.md` and `AGENTS.md` for mission requirements
   - Read relevant sections of `validation-contract.md` for testable behaviors
   - Review existing code patterns in the codebase

2. **Write Tests First (TDD)**
   - Write failing unit tests for the component/service before implementation
   - Write failing Playwright e2e tests for user flows
   - Tests must verify:
     - Component renders correctly
     - User interactions work as expected
     - Error states handled gracefully

3. **Implement Feature**
   - Follow existing code patterns and conventions
   - Use CSS Modules or plain CSS (no Tailwind unless specified)
   - Ensure accessibility (ARIA labels, keyboard nav)
   - Follow ancient Rome aesthetic: warm stone colors, serif fonts

4. **Verify Implementation**
   - Run `npm run typecheck` - must pass
   - Run `npm run lint` - must pass
   - Run unit tests - all must pass
   - Run e2e tests - all must pass
   - Manual verification with `agent-browser`:
     - Take screenshots of key states
     - Verify responsive behavior
     - Test keyboard navigation

5. **Commit with Evidence**
   - Include test output and screenshots in handoff
   - Document any deviations from TDD approach

## Example Handoff

```json
{
  "salientSummary": "Implemented meditation chat UI with streaming responses and session summary. All 12 test cases pass. Verified with agent-browser showing streaming text animation and summary generation.",
  "whatWasImplemented": "Created MeditationChat component with streaming message display, ChatMessage sub-components, SessionSummary view, and ActionItems list. Integrated with session API for message persistence.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run typecheck", "exitCode": 0, "observation": "TypeScript compilation successful" },
      { "command": "npm run test -- --grep 'MeditationChat'", "exitCode": 0, "observation": "12 tests passing" },
      { "command": "npm run test:e2e -- --grep 'meditation'", "exitCode": 0, "observation": "5 e2e tests passing" }
    ],
    "interactiveChecks": [
      { "action": "Start meditation, verify Marcus greeting", "observed": "Marcus greets user by name, streaming animation visible" },
      { "action": "Send message, observe streaming response", "observed": "Text streams in real-time, message persists after refresh" },
      { "action": "End session, verify summary", "observed": "Summary shows key points, 3 action items displayed" }
    ]
  },
  "tests": {
    "added": [
      { "file": "src/components/MeditationChat.test.tsx", "cases": ["renders greeting", "displays streaming messages", "persists messages on refresh", "generates summary on end"] },
      { "file": "e2e/meditation.spec.ts", "cases": ["complete meditation flow", "session persistence", "error handling"] }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on API endpoint that doesn't exist yet
- Requirements are ambiguous or contradictory
- Existing bugs affect this feature
- Need clarification on design/aesthetic decisions
