# Testing Conventions

## E2E Testing for Flet Apps

**Flet's CanvasKit renderer does not expose DOM elements**, making Playwright browser automation impossible for Flet desktop apps. All E2E tests in this project use **component-level mocking with `unittest.mock`** instead:

- Tests import Flet screen classes directly (e.g., `from screens import HistoryPage`)
- Use `MagicMock` / `AsyncMock` for app/page dependencies
- Test component structure by constructing views manually via helper functions (`_build_*_view_manually`)
- Avoid `asyncio.create_task` in tests by constructing views without the real async lifecycle

Pattern established in: `tests/e2e/test_home_page.py`, `tests/e2e/test_history_page.py`, `tests/e2e/test_session_page.py`, `tests/e2e/test_session_detail_page.py`, `tests/e2e/test_settings_page.py`, `tests/e2e/test_profile_page.py`

## Known Flet Limitations (0.28.x)

- `ft.Column` does not have `cross_alignment` in all versions — tests work around by constructing views manually
- `ft.Card` does not have `on_click` — navigation is tested via mock handlers
- `asyncio.create_task` requires running event loop — avoid by not calling `build()` directly in tests
