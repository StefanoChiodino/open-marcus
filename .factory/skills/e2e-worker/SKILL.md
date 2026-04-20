---
name: e2e-worker
description: Write Playwright E2E tests for OpenMarcus Flet desktop application
---

# E2E Test Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

When implementing E2E tests for the OpenMarcus Flet application using Playwright.

## Required Skills

- `tuistory` - For launching and interacting with the Flet TUI app during testing
- `agent-browser` - NOT USED (we use tuistory for Flet desktop app)

## Work Procedure

### Step 1: Understand the Screen Under Test

1. Read the screen's source code in `src/screens/{screen_name}.py`
2. Identify all UI elements (TextFields, Buttons, Dropdowns, etc.)
3. Identify all user interactions (clicks, form submissions, navigation)
4. Map each interaction to its corresponding VAL-* assertion in the validation contract

### Step 2: Set Up Test Infrastructure

1. Create `src/tests/e2e/conftest.py` with shared fixtures:
   - `app` - Starts Flet app in test mode
   - `page` - Provides Playwright page object
   - `backend` - Provides FastAPI test client
   - `test_user` - Creates/cleans up test user
   - `authenticated_page` - Page logged in as test user

2. Create page object classes for common screens:
   - `LoginPage`, `RegisterPage`, `HomePage`, etc.
   - Encapsulate selectors and helper methods

### Step 3: Write Tests for the Screen

1. Create `src/tests/e2e/test_{screen_name}.py`
2. Write one test per VAL-* assertion
3. Follow the naming convention: `test_{feature}_{expected_behavior}`
4. Add `VAL-{AREA}-{NUMBER}` docstring comment linking to validation contract

Example:
```python
class TestLoginScreen:
    """E2E tests for Login Screen - VAL-LOGIN-*"""
    
    def test_username_field_exists(self, page: Page):
        """VAL-LOGIN-001: Username field exists and accepts input"""
        page.goto("/login")
        username = page.get_by_label("Username")
        expect(username).to_be_visible()
        expect(username).to_be_focused()
```

### Step 4: Implement the Tests

1. Navigate to the screen using `page.goto("/route")`
2. Interact with elements using Playwright locators
3. Use `expect()` for assertions
4. Handle loading states with `page.wait_for_load_state()`
5. Handle async updates with appropriate waits

### Step 5: Verify Coverage

1. Run the test file: `pytest tests/e2e/test_{screen_name}.py -v`
2. Check that all VAL-* assertions for this screen are covered
3. Fix any failing tests
4. Ensure no test is skipped or marked xfail

### Step 6: Final Verification

1. Run all E2E tests: `pytest tests/e2e/ -v`
2. Run with `--tb=short` for cleaner output
3. Verify 100% coverage of the screen's VAL-* assertions

## Example Handoff

```json
{
  "salientSummary": "Implemented E2E tests for Login Screen covering all 13 VAL-LOGIN-* assertions. Created test_login_screen.py with 13 passing tests.",
  "whatWasImplemented": "Playwright E2E tests for Login Screen: username/password fields, login button, register link, validation (empty fields), error handling (invalid creds, network error), loading state, success navigation (to onboarding or home), token storage, error banner dismiss/retry.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {"command": "pytest tests/e2e/test_login_screen.py -v", "exitCode": 0, "observation": "13 tests passed"}
    ],
    "interactiveChecks": [
      {"action": "Manual verification of login flow", "observed": "Login success navigates to home, token stored, profile loaded"}
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/tests/e2e/test_login_screen.py",
        "cases": [
          {"name": "test_username_field_exists", "verifies": "VAL-LOGIN-001"},
          {"name": "test_password_field_masks", "verifies": "VAL-LOGIN-002"},
          {"name": "test_login_button_exists", "verifies": "VAL-LOGIN-003"},
          {"name": "test_register_link_navigates", "verifies": "VAL-LOGIN-004"},
          {"name": "test_empty_fields_error", "verifies": "VAL-LOGIN-005"},
          {"name": "test_invalid_credentials_error", "verifies": "VAL-LOGIN-006"},
          {"name": "test_network_error_banner", "verifies": "VAL-LOGIN-007"},
          {"name": "test_loading_state", "verifies": "VAL-LOGIN-008"},
          {"name": "test_success_to_onboarding", "verifies": "VAL-LOGIN-009"},
          {"name": "test_success_to_home", "verifies": "VAL-LOGIN-010"},
          {"name": "test_token_stored", "verifies": "VAL-LOGIN-011"},
          {"name": "test_error_dismiss", "verifies": "VAL-LOGIN-012"},
          {"name": "test_error_retry", "verifies": "VAL-LOGIN-013"}
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Screen implementation differs significantly from validation contract
- Required API endpoints are missing or have different contracts
- Test infrastructure cannot be set up (missing dependencies)
- Found bugs in production code that block testing
