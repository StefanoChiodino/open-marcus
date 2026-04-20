# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## OpenMarcus E2E Testing Environment

### Dependencies

- Python 3.9+ with venv
- Flet 0.28.3+ (desktop/web framework)
- Playwright for E2E testing
- FastAPI + SQLAlchemy for backend
- pytest for test execution

### Setup

```bash
cd src
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### External Services

- **Backend API**: localhost:8000 (FastAPI)
- **Flet Web UI**: localhost:3100
- **SQLite**: In-memory for tests, file-based for dev

### Testing Notes

- E2E tests use Playwright with Chromium browser
- Backend tests use FastAPI TestClient with in-memory SQLite
- Unit tests use pytest with mocked services
- All tests must be deterministic (no flaky tests)

### Platform Notes

- macOS (Darwin) - primary development platform
- Tests run headless in CI, headed for debugging
- Audio/video features may be limited in headless mode
