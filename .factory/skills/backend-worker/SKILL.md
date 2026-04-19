---
name: backend-worker
description: Python/FastAPI backend development for OpenMarcus Flet rewrite
---

# Backend Worker (Python)

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- FastAPI endpoints and routing
- SQLAlchemy database models and operations
- llama-cpp-python LLM integration
- faster-whisper STT processing
- piper-tts TTS processing
- Authentication (JWT, argon2, encryption)
- Memory system (psych_update, semantic_assertions)

## Required Skills

- Python 3.11+
- SQLAlchemy 2.0 patterns
- FastAPI router patterns
- Pydantic validation

## Work Procedure

### 1. Read Mission Context
- Read mission.md and AGENTS.md for mission requirements
- Read validation-contract.md for testable behaviors
- Review Stoic Emperor patterns in /Users/stefano/repos/stoic-emperor/src/core/emperor_brain.py
- Review aigent memory architecture in /Users/stefano/repos/aigent/docs/memory-architecture.md

### 2. Set Up Environment
```bash
cd /Users/stefano/repos/open-marcus/backend-python
source venv/bin/activate
```

### 3. Implement Feature

**For API endpoints:**
- Create FastAPI router in `src/routers/`
- Use Pydantic models for request/response validation
- Add proper error handling with HTTPException
- Include OpenAPI documentation

**For database models:**
- Create SQLAlchemy model in `src/models/`
- Use 2.0 style (async where possible)
- Add proper indexes
- Include relationship definitions

**For LLM integration:**
- Use llama-cpp-python ChatCompletions interface
- Implement streaming with async generators
- Handle model loading/unloading gracefully
- Include token counting

**For memory system:**
- Follow Stoic Emperor PsychUpdate schema
- Extract semantic assertions per response
- Build context from accumulated memories
- Store all in database

### 4. Write Tests
```bash
pytest tests/ -v
```

### 5. Verify Implementation
- Run type checker: `mypy src/` (if installed)
- Run linter: `ruff check src/`
- Run tests: `pytest tests/ -v`
- Manual API testing with httpx test client

### 6. Commit with Evidence

## Example Handoff

```json
{
  "salientSummary": "Implemented authentication service with argon2 hashing, JWT tokens, and database encryption. All tests pass.",
  "whatWasImplemented": "Created auth router with register/login endpoints, password hashing service, JWT generation/validation, encryption middleware.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pytest tests/test_auth.py -v", "exitCode": 0, "observation": "All 12 tests passing" }
    ]
  },
  "tests": {
    "added": ["tests/test_auth.py with register, login, token validation tests"]
  },
  "discoveredIssues": []
}
```

## Key Patterns

### Database Model
```python
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

### Pydantic Schema
```python
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
```

### FastAPI Router
```python
from fastapi import APIRouter, HTTPException
from .schemas import UserCreate, UserResponse
from .service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()

@router.post("/register", response_model=UserResponse)
async def register(data: UserCreate):
    user = await auth_service.create_user(data)
    if not user:
        raise HTTPException(400, "Username already exists")
    return user
```

### Memory Context (Stoic Emperor Pattern)
```python
def build_memory_context(user_id: str) -> dict:
    """Build context for LLM including user memories."""
    profile = get_profile(user_id)
    assertions = get_recent_assertions(user_id, limit=5)
    psych_history = get_emotional_history(user_id, limit=10)
    
    return {
        "profile": format_profile(profile),
        "insights": [a.text for a in assertions],
        "emotional_state": psych_history[-1].emotional_state if psych_history else "unknown",
        "patterns": extract_patterns(psych_history),
    }
```

## When to Return to Orchestrator

- Database schema needs changes that affect other features
- LLM integration has unexpected behavior
- Requirements are ambiguous
- Need clarification on API design
- Memory system patterns unclear
