---
name: e2e-worker
description: E2E test implementation for OpenMarcus Flet Python app
---

# E2E Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- End-to-end testing of complete user flows
- Cross-feature integration verification
- Memory continuity testing
- Privacy/security verification

## Required Skills

- `tuistry` - For terminal UI testing
- `agent-browser` - For web interface testing if Flet web target used

## Work Procedure

### 1. Read Mission Context
- Read mission.md and AGENTS.md for requirements
- Read validation-contract.md for testable behaviors
- Read features.json to understand current feature scope

### 2. Understand Test Structure

Tests are located in `/Users/stefano/repos/open-marcus/backend-python/tests/`

```
tests/
├── conftest.py           # Shared fixtures
├── test_auth.py          # Authentication flows
├── test_sessions.py      # Session management
├── test_memory.py        # Memory system
├── test_integration.py   # Cross-feature flows
└── test_privacy.py       # Privacy verification
```

### 3. Write Tests

**Authentication Tests:**
```python
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "testpass123"
        })
        assert response.status_code == 200
        assert "token" in response.json()
```

**Memory Continuity Tests:**
```python
@pytest.mark.asyncio
async def test_memory_persists():
    # Create session 1, share info
    # End session
    # Create session 2
    # Verify AI references previous info
```

**Complete Journey Tests:**
```python
@pytest.mark.asyncio
async def test_full_journey():
    # Register → Onboard → Session → History
    pass
```

### 4. Run Tests
```bash
cd /Users/stefano/repos/open-marcus/backend-python
source venv/bin/activate
pytest tests/ -v
```

### 5. Verify Coverage

Ensure all VAL-XXX assertions from validation-contract.md are covered:
- VAL-AUTH-001 through VAL-AUTH-006
- VAL-SESSION-001 through VAL-SESSION-006
- VAL-MEMORY-001 through VAL-MEMORY-006
- VAL-AI-001 through VAL-AI-007
- VAL-SPEECH-001 through VAL-SPEECH-004
- VAL-SETTINGS-001 through VAL-SETTINGS-005
- VAL-PRIVACY-001 through VAL-PRIVACY-004
- VAL-CROSS-001 through VAL-CROSS-004

## Test Categories

### Unit Tests
- Individual service functions
- Fast, isolated tests
- Mock external dependencies

### Integration Tests
- API endpoint testing
- Database operations
- Service interactions

### E2E Tests
- Complete user flows
- Memory continuity
- Privacy verification

## Example Handoff

```json
{
  "salientSummary": "Implemented comprehensive e2e tests for auth and session flows covering 15 assertions.",
  "whatWasImplemented": "Created test_auth.py with register/login/logout tests, test_sessions.py with session CRUD and state machine tests.",
  "whatWasLeftUndone": "Memory continuity tests pending LLM integration",
  "verification": {
    "commandsRun": [
      { "command": "pytest tests/ -v", "exitCode": 0, "observation": "28 tests passed" }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on incomplete backend
- Memory tests need LLM integration
- Privacy tests need runtime verification
- All tests pass and feature complete
