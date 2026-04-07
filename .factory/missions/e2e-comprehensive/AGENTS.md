# Comprehensive E2E Testing Mission - Agent Guidance

## Mission Overview

This mission creates comprehensive e2e/smoke tests for the OpenMarcus meditation app. The goal is bombproof coverage that catches any regression before it reaches production.

**Scope:**
- All authentication flows (login, register, logout, session persistence)
- All user flows (onboarding, profile, home, session, history, settings)
- Voice controls (TTS, STT)
- Error handling and toast notifications
- Responsive design at multiple breakpoints
- Cross-area flows
- Concurrent sessions
- Performance and accessibility

## Mission Boundaries

**Port Range:** 3100-3199. Frontend dev server uses 3101, backend uses 3100.

**External Services:**
- Ollama on localhost:11434 (optional - AI responses will fail but UI should still work)
- STT server on localhost:8765
- TTS server on localhost:8766
- SQLite database at ./data/openmarcus.db (auto-created)

**Off-Limits:**
- Do not modify production code - only add tests
- Do not modify backend routes or services - only test them
- Do not add new features - only test existing functionality

## Testing Infrastructure

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth-comprehensive.spec.ts

# Run with UI (headed mode)
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- --grep "login"
```

### Test File Naming Convention

Tests are named `{area}-comprehensive.spec.ts` to indicate comprehensive coverage.

### Test Structure

Each test file should:
1. Import from @playwright/test
2. Use describe blocks to group related tests
3. Have helper functions for common operations
4. Include VAL-XXX assertions as test names

### Helper Functions to Create

Create shared helpers in `e2e/helpers.ts`:
- `registerAndGetToken()` - Register and return token
- `loginAndGetToken()` - Login and return token
- `createProfile()` - Create profile via UI
- `clearAllData()` - Clear all user data
- `setupAuthenticatedUser()` - Full setup: register, login, create profile

## Coding Conventions

### Test Organization
- Group tests by area using `test.describe()`
- Use `test.beforeEach()` for common setup
- Keep tests focused on one assertion per test
- Use descriptive test names that match VAL-XXX assertions

### Selectors Priority
1. Role-based (`getByRole('button', { name: '...' })`) - preferred
2. Label-based (`getByLabel(...)`) 
3. Text-based (`getByText(...)`)
4. CSS class last resort

### Assertions
- Use `expect()` from @playwright/test
- Include descriptive messages in assertions
- Use `screenshot` option for visual verification when helpful

### Error Handling
- Use try/catch for API calls
- Include timeout options for async operations
- Use `waitForLoadState('networkidle')` after navigation

## Testing & Validation Guidance

### Test Data Management
- Use unique usernames (timestamp-based) to avoid conflicts
- Clear data before each test to ensure isolation
- Use `test.beforeEach()` for setup, `test.afterEach()` for cleanup

### Network Handling
- Wait for network idle after navigation
- Use appropriate timeouts for API calls
- Mock only when necessary (prefer real API)

### Responsive Testing
- Test at 1280px (desktop), 768px (tablet), 375px (mobile)
- Use `page.setViewportSize()` to change viewport

### Authentication in Tests
- Store token in localStorage for API calls
- Use `page.evaluate()` to set localStorage
- Clear localStorage between tests

## Key Routes to Test

- `/` - Home page (after auth)
- `/login` - Login page
- `/register` - Registration page
- `/session` - Meditation chat
- `/history` - Session history list
- `/history/{id}` - Session detail
- `/profile` - Profile settings
- `/settings` - App settings

## Common Issues to Watch For

1. **Flaky tests** - Add appropriate waits, avoid hard-coded sleeps
2. **Data pollution** - Always clear data in beforeEach
3. **Auth state** - Clear localStorage before each test
4. **Race conditions** - Wait for elements to be visible/clickable
5. **Network timing** - Wait for networkidle after API calls

## Known Pre-Existing Issues

- Model mismatch (gemma4 vs llama3): AI responses may fail but UI handles gracefully
- TTS/STT servers may not be running - test error handling paths
- Long Marcus responses may take significant time - use longer timeouts

## Verification Checklist

Before marking a feature complete:
- [ ] All VAL-XXX assertions have corresponding tests
- [ ] Tests pass consistently (run 3 times to verify)
- [ ] No console errors during test execution
- [ ] Screenshots captured for any visual assertions
- [ ] TypeScript compilation passes
- [ ] Lint passes
