# User Testing

This document describes how to perform user testing validation for the OpenMarcus application.

## Validation Surface

**Browser Testing:** The primary validation surface is the web UI accessed via browser.

**Tools:**
- `agent-browser` - For automated browser testing with Playwright
- Manual browser - For exploratory testing and screenshots

**Breakpoints:**
- Desktop: 1280px width
- Tablet: 768px width
- Mobile: 375px width

## Required Testing Skills/Tools

- Playwright for automated e2e tests
- `agent-browser` skill for browser automation
- Network inspection for API verification

## Resource Cost Classification

**E2E Tests (Playwright):**
- Memory per instance: ~300MB (browser) + ~200MB (app)
- CPU: Moderate during test execution
- Max concurrent validators: 3 (given typical machine resources)

## Testing Approach

### Automated E2E Tests

**Running Tests:**
```bash
# All e2e tests
npm run test:e2e

# Specific file
npm run test:e2e -- auth-comprehensive.spec.ts

# With UI
npm run test:e2e -- --headed

# Specific test
npm run test:e2e -- --grep "VAL-AUTH-001"
```

**Test Files Location:** `/Users/stefano/repos/open-marcus/e2e/`

### Manual Verification

When automated tests need manual verification:

1. Start services:
   ```bash
   # Backend
   PORT=3100 npx tsx backend/server.ts &
   
   # Frontend
   PORT=3101 npm run dev:frontend &
   ```

2. Open browser to `http://localhost:3101`

3. Navigate and verify each VAL-XXX assertion

## Validation Contract Mapping

Each VAL-XXX assertion in `validation-contract.md` maps to:
- An automated Playwright test in the e2e suite
- Manual verification steps if automated testing not possible

## Test Isolation

- Each test file runs independently
- Use `test.beforeEach()` to setup fresh state
- Clear localStorage and data between tests
- Use unique usernames (timestamp-based) to avoid conflicts

## Common Issues

1. **Tests failing due to timing** - Add appropriate waits, use `waitForLoadState('networkidle')`
2. **Auth state leaking** - Always clear localStorage in beforeEach
3. **Data pollution** - Use `clearAllData()` helper to reset state
4. **Ollama not responding** - Tests should handle this gracefully with timeouts
