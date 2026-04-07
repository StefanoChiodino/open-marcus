# E2E Worker Skill

## Purpose
Run Playwright e2e tests to validate user-facing functionality.

## Procedures

### Running E2E Tests

**Prerequisites:**
1. Backend must be running on port 3100
2. Frontend must be running on port 3101
3. Database must be accessible (postgres on 5432)

**Run all e2e tests:**
```bash
npm run test:e2e
```

**Run specific test file:**
```bash
npx playwright test e2e/history-smoke.spec.ts
```

**Run tests matching a pattern:**
```bash
npx playwright test --grep "session loading|history.*session"
```

**Run with headed browser (visible):**
```bash
npx playwright test --headed
```

**Run with debug mode:**
```bash
npx playwright test --debug
```

### Important Testing Notes

1. **Do NOT use `clearAllData()` in beforeEach hooks** - This hides user isolation bugs. Tests should run with existing data to catch cross-user data leaks.

2. **Test both UI navigation AND direct URL access** - Many bugs only appear when accessing URLs directly (deep linking).

3. **Always verify error states** - Test invalid inputs, non-existent IDs, and edge cases.

4. **Screenshot on failure** - Playwright automatically screenshots failed tests, but you can also manually capture:
```typescript
await page.screenshot({ path: 'failure.png' });
```

### Test Structure

E2e tests are located in `/Users/stefano/repos/open-marcus/e2e/` and use:
- `@playwright/test` framework
- `test` and `expect` from `@playwright/test`
- `page` fixture for browser interactions
- Helper functions in `e2e/helpers.ts` (if they exist)

### Common Test Patterns

**Waiting for navigation:**
```typescript
await page.waitForURL(/\/history\/[^/]+$/);
```

**Waiting for element:**
```typescript
await expect(page.getByRole('heading', { name: 'Session Review' })).toBeVisible({ timeout: 10000 });
```

**Handling async operations:**
```typescript
await expect(page.getByText('Marcus is reflecting...')).not.toBeVisible({ timeout: 30000 });
```

### Handoff Fields

When completing the feature, report:
- `testResults`: Summary of test results (passed/failed/skipped)
- `coverageGaps`: What scenarios are still not covered
- `anyDbStateIssues`: If tests failed due to data issues vs actual bugs
