# User Testing

Testing surface, required testing skills/tools, and resource cost classification per surface.

---

## Validation Surface

### Primary Tool: Playwright E2E Testing

OpenMarcus is a Flet desktop application that also supports web mode. For E2E testing:

- **Tool**: Playwright with Chromium browser
- **Approach**: Run Flet in web mode, test via browser automation
- **Why**: Flet supports `flet run --web` which serves the app as a web app

### Alternative: tuistory

For testing the desktop TUI version directly:
- **Tool**: `tuistory` skill for TUI automation
- **Use when**: Desktop-specific features need testing
- **Setup**: Launch `flet run` (desktop mode)

## Test Surfaces

### 1. Lock Screen (/lock)
- **Interactions**: Password entry, form submission, mode toggle
- **Resource cost**: Low (simple forms)
- **Max concurrent**: 5

### 2. Login/Register Screens
- **Interactions**: Form filling, validation, auth flow
- **Resource cost**: Low (forms + API calls)
- **Max concurrent**: 5

### 3. Onboarding/Profile
- **Interactions**: Form filling, API calls, navigation
- **Resource cost**: Low
- **Max concurrent**: 5

### 4. Home Page
- **Interactions**: Navigation, profile display, button clicks
- **Resource cost**: Low
- **Max concurrent**: 5

### 5. Session Page (Chat)
- **Interactions**: Message sending, streaming response, TTS playback
- **Resource cost**: Medium (streaming + audio)
- **Max concurrent**: 3 (due to streaming)

### 6. History/Settings Pages
- **Interactions**: List display, settings changes, dialogs
- **Resource cost**: Low
- **Max concurrent**: 5

## Validation Concurrency

Based on resource analysis:

| Surface | Max Concurrent | Rationale |
|---------|---------------|-----------|
| Lock/Login/Register | 5 | Simple forms, minimal resource usage |
| Onboarding/Profile | 5 | Forms + API, low memory |
| Home | 5 | Static display, low resource |
| Session (chat) | 3 | Streaming responses, potential audio |
| History | 5 | List rendering, low resource |
| Settings | 5 | Forms + settings save, low resource |

**Overall recommendation**: Run E2E tests with max 3-5 concurrent workers depending on test mix.

## Setup Requirements

### For Playwright E2E Tests

1. Start backend: `uvicorn src.api:app --port 8000`
2. Start Flet web: `flet run --web --port 3100`
3. Run tests: `pytest tests/e2e/ -v`

### For tuistry Desktop Tests

1. Start backend: `uvicorn src.api:app --port 8000`
2. Start Flet desktop: `flet run`
3. Use tuistory to automate desktop app

## Test Fixtures

```python
# conftest.py
import pytest
from playwright.sync_api import sync_playwright, Page

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

@pytest.fixture
def page(browser):
    page = browser.new_page()
    yield page
    page.close()

@pytest.fixture
def authenticated_page(page):
    # Login flow
    page.goto("http://localhost:3100/login")
    page.fill('[label="Username"]', "testuser")
    page.fill('[label="Password"]', "testpass123")
    page.click('button:has-text("Login")')
    page.wait_for_url("**/home")
    yield page
```

## Validation Contract Assertions

All 130+ assertions in `validation-contract.md` must be verified:

- **VAL-LOCK-*** : 13 assertions
- **VAL-LOGIN-*** : 13 assertions
- **VAL-REGISTER-*** : 13 assertions
- **VAL-ONBOARD-*** : 9 assertions
- **VAL-HOME-*** : 16 assertions
- **VAL-PROFILE-*** : 11 assertions
- **VAL-SESSION-*** : 18 assertions
- **VAL-HISTORY-*** : 12 assertions
- **VAL-DETAIL-*** : 10 assertions
- **VAL-SETTINGS-*** : 15 assertions
- **VAL-NAV-*** : 6 assertions
- **VAL-CROSS-*** : 7 assertions

**Total**: 143 assertions

## Known Testing Considerations

1. **Audio features**: TTS playback may not work in headless mode - mock or skip
2. **Streaming**: Message streaming tests may be timing-sensitive - use appropriate waits
3. **Async updates**: Flet uses async updates - wait for DOM changes
4. **Navigation timing**: Use `page.wait_for_url()` after navigation
5. **Mock LLM**: In tests, mock LLM responses to avoid dependency on AI service
6. **Flet CanvasKit Limitation**: Flet's CanvasKit web renderer does not expose DOM elements for browser automation (agent-browser/playwright). The rendered UI exists in a `<canvas>` element inaccessible to DOM queries. For Flet apps, use component-level testing with mocks (as done in `src/tests/e2e/test_session_page.py`) rather than browser-based DOM interaction testing.
