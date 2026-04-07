# Comprehensive E2E Testing Mission

## Plan Overview

Create comprehensive e2e/smoke tests for the OpenMarcus meditation app that ensure reliable user workflows. The goal is bombproof coverage that catches any regression before it reaches production.

## Expected Functionality

### Milestone: auth-flows
- Comprehensive authentication tests (login, register, logout, session persistence)
- Onboarding flow tests (form validation, edge cases)
- Protected routes tests

### Milestone: profile-flows
- Profile display and editing tests
- Profile persistence across logout/login

### Milestone: session-flows
- Session core flow tests (start, message, end)
- Voice controls tests (TTS toggle, STT error handling)

### Milestone: history-flows
- History list tests
- Session detail tests
- Direct URL access tests

### Milestone: settings-flows
- Data management tests (export, import, clear)
- TTS settings tests
- STT settings tests
- Model selection tests

### Milestone: ui-flows
- Toast notification tests
- Error handling tests
- Responsive design tests

### Milestone: cross-flows
- Cross-area flow tests
- Concurrent session tests
- Performance tests
- Accessibility tests

## Environment Setup

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install chromium

# Start services
PORT=3100 npx tsx backend/server.ts &
PORT=3101 npm run dev:frontend &
```

## Infrastructure

**Services:**
- Backend API: localhost:3100
- Frontend: localhost:3101
- SQLite: ./data/openmarcus.db (auto-created)
- Ollama: localhost:11434 (optional)
- STT server: localhost:8765 (optional)
- TTS server: localhost:8766 (optional)

**Ports:** 3100-3199 available

**Off-Limits:**
- Do not modify production code - only add tests
- Do not modify backend routes - only test them
- Ports 3000-3010 (user's dev servers)

## Testing Strategy

### E2E Test Files
- `e2e/auth-comprehensive.spec.ts` - Auth flows
- `e2e/onboarding-comprehensive.spec.ts` - Onboarding flows
- `e2e/profile-comprehensive.spec.ts` - Profile flows
- `e2e/session-core-comprehensive.spec.ts` - Session core
- `e2e/session-voice-comprehensive.spec.ts` - Voice controls
- `e2e/history-comprehensive.spec.ts` - History flows
- `e2e/settings-data-comprehensive.spec.ts` - Data management
- `e2e/settings-tts-comprehensive.spec.ts` - TTS settings
- `e2e/settings-stt-comprehensive.spec.ts` - STT settings
- `e2e/settings-model-comprehensive.spec.ts` - Model selection
- `e2e/toast-comprehensive.spec.ts` - Toast notifications
- `e2e/error-handling-comprehensive.spec.ts` - Error handling
- `e2e/responsive-comprehensive.spec.ts` - Responsive design
- `e2e/cross-flows-comprehensive.spec.ts` - Cross-area flows
- `e2e/concurrent-comprehensive.spec.ts` - Concurrent sessions
- `e2e/performance-comprehensive.spec.ts` - Performance
- `e2e/accessibility-comprehensive.spec.ts` - Accessibility

### Running Tests
```bash
# All e2e tests
npm run test:e2e

# Specific file
npm run test:e2e -- auth-comprehensive.spec.ts
```

## Non-Functional Requirements

- All tests must be deterministic (no flaky tests)
- Tests must be isolated (no data pollution)
- Tests must use appropriate timeouts
- Tests must clean up after themselves
