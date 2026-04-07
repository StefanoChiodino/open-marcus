---
name: e2e-worker
description: E2E test implementation for OpenMarcus comprehensive testing
---

# E2E Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

This worker handles e2e test implementation for the comprehensive e2e testing mission. Use this worker for features related to:
- Creating new e2e test files
- Adding tests to existing test files
- Verifying test coverage against validation contract

## Required Skills

- `agent-browser` - For manual verification of UI behavior during test development
- `tuistory` - Not needed for e2e tests

## Work Procedure

### Step 1: Read Mission Context

1. Read the mission's `validation-contract.md` to understand what assertions need coverage
2. Read the mission's `features.json` to understand which feature you're implementing
3. Read existing e2e tests in `/Users/stefano/repos/open-marcus/e2e/` to understand patterns

### Step 2: Understand Test Patterns

Review existing tests to understand:
- How authentication is handled
- How test data is created and cleaned up
- What helper functions exist
- How assertions are structured

### Step 3: Implement Tests

For each test file you're creating:

1. **Create the test file** at `/Users/stefano/repos/open-marcus/e2e/{area}-comprehensive.spec.ts`

2. **Include proper imports:**
   ```typescript
   import { test, expect } from '@playwright/test';
   ```

3. **Add shared helpers** at the top of the file:
   - `registerAndGetToken()` - Register via API, return token
   - `clearAllData()` - Clear all user data via API
   - `createProfile()` - Navigate UI to create profile

4. **Structure tests** using `test.describe()` for grouping:
   ```typescript
   test.describe('Auth Flows', () => {
     test.beforeEach(async ({ page }) => {
       // Setup for each test
     });
     
     test('VAL-AUTH-001: Login with valid credentials redirects to home', async ({ page }) => {
       // Test implementation
     });
   });
   ```

5. **Follow selector priority:**
   - Role-based: `getByRole('button', { name: '...' })`
   - Label-based: `getByLabel(...)`
   - Text-based: `getByText(...)`
   - CSS class: last resort

6. **Include assertions** matching VAL-XXX names:
   ```typescript
   test('VAL-AUTH-001: Login with valid credentials redirects to home', async ({ page }) => {
     // Arrange - register user first
     const token = await registerAndGetToken();
     
     // Act - navigate to login and submit
     await page.goto('/login');
     await page.getByLabel('Username').fill(username);
     await page.getByLabel('Password').fill(password);
     await page.getByRole('button', { name: 'Sign In' }).click();
     
     // Assert - redirected to home
     await expect(page).toHaveURL('/');
     await expect(page.getByRole('heading', { name: 'Welcome to OpenMarcus' })).toBeVisible();
   });
   ```

### Step 4: Use Appropriate Timeouts

- Navigation: `waitForLoadState('networkidle')`
- Element visibility: Use `toBeVisible({ timeout: 10000 })`
- API responses: Set appropriate timeouts
- Session/Marcus responses: May need 30-60 seconds

### Step 5: Handle Async and Waiting

```typescript
// Wait for loading to complete
await expect(page.getByText('Loading...')).not.toBeVisible();

// Wait for network to settle
await page.waitForLoadState('networkidle');

// Wait for specific element
await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible({ timeout: 10000 });
```

### Step 6: Verify Test Works

1. Run the test: `npm run test:e2e -- {filename}.spec.ts`
2. If it fails, debug and fix
3. Run 3 times to ensure stability
4. Check for console errors

### Step 7: Run Full Suite

After implementing all tests for a feature:
1. Run full e2e suite: `npm run test:e2e`
2. Fix any failing tests
3. Ensure no console errors

## Example Handoff

```json
{
  "salientSummary": "Implemented comprehensive auth flow tests covering 10 assertions (VAL-AUTH-001 through VAL-AUTH-010). Tests cover login success/failure, registration, password guidance, logout, session persistence.",
  "whatWasImplemented": "Created e2e/auth-comprehensive.spec.ts with 10 test cases covering all auth flows including edge cases like invalid credentials, duplicate username, and session persistence after reload.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run test:e2e -- auth-comprehensive.spec.ts", "exitCode": 0, "observation": "All 10 auth tests passed" },
      { "command": "npm run test:e2e -- --grep 'logout'", "exitCode": 0, "observation": "Logout flow tests pass" }
    ],
    "interactiveChecks": [
      { "action": "Login with valid credentials", "observed": "Redirected to home with personalized greeting" },
      { "action": "Login with invalid password", "observed": "Error alert displayed" },
      { "action": "Logout clears localStorage", "observed": "Token removed, redirected to /login" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "e2e/auth-comprehensive.spec.ts",
        "cases": [
          { "name": "VAL-AUTH-001: Login with valid credentials", "verifies": "Successful login redirects to home" },
          { "name": "VAL-AUTH-002: Login with invalid password", "verifies": "Error message displayed" },
          { "name": "VAL-AUTH-007: Logout clears auth", "verifies": "Token cleared, redirect to login" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on an API endpoint or behavior that doesn't exist
- Requirements are ambiguous or contradictory
- Existing bugs affect test implementation
- All tests pass consistently and feature is complete
