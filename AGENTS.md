# OpenMarcus

**OpenMarcus** is a private, local-first AI mental health companion built with Python/Flet. It provides AI-assisted meditation and journaling with a Marcus Aurelius stoic philosopher persona, running entirely offline on the user's machine.

## What This Project Does

OpenMarcus is a meditation app that:
- Provides AI-powered conversational meditation sessions with Marcus Aurelius as the companion
- Stores all conversation history locally with encryption at rest
- Uses local LLM inference (llama-cpp-python with GGUF models)
- Supports voice input (faster-whisper STT) and voice output (piper-tts TTS)
- Tracks mental health journey over time with a memory system (psych_updates, semantic_assertions)
- Protects user data with password-based encryption (Fernet/AES-256)

## Tech Stack

- **UI**: Flet (Python desktop/mobile framework)
- **Backend**: FastAPI + SQLAlchemy 2.0 (async)
- **Database**: SQLite with encrypted storage via Fernet
- **LLM**: llama-cpp-python (local GGUF model inference)
- **STT**: faster-whisper (local speech-to-text)
- **TTS**: piper-tts (local text-to-speech)
- **Auth**: JWT + argon2id password hashing

## Key Code Locations

| Component | Path | Purpose |
|-----------|------|---------|
| Flet app | `src/main.py` | App entry point, route handling |
| API server | `src/api.py` | FastAPI application |
| Screens | `src/screens/` | Flet UI screens (login, home, session, etc.) |
| Routers | `src/routers/` | API route handlers |
| Services | `src/services/` | Business logic (llm, persona, auth, etc.) |
| Models | `src/models/` | SQLAlchemy ORM models |
| Tests | `src/tests/` | pytest unit tests (380+) |

## Database Schema

Core tables: `users`, `profiles`, `sessions`, `messages`, `semantic_assertions`, `psych_updates`, `persona_memories`. All sensitive data encrypted at rest via Fernet.

## Important Patterns

- **Auth**: JWT tokens in Authorization header, argon2id hashing
- **Encryption**: Password-derived key encrypts database via Fernet
- **Persona**: Marcus Aurelius stoic philosopher, builds dynamic system prompts with user context
- **Memory**: Semantic assertions extracted per response; psych_updates track emotional state
- **Context**: Token-based hot buffer approach (~6000 tokens), character/4 counting

## Development Commands

```bash
source venv/bin/activate
flet run              # Run the app
pytest tests/ -v       # Run tests
mypy src/             # Type check
ruff check src/        # Lint
uvicorn src.api:app --reload --port 8000  # Run backend only
```

## Project State

Active development. All 380+ unit tests passing. Privacy-first: no telemetry, no external network requests, all data encrypted locally.

## External Services (Optional)

- Ollama on localhost:11434 — for AI responses (app handles gracefully if unavailable)
- STT server on localhost:8765
- TTS server on localhost:8766

## Boundaries

- **Do not** modify production code unless fixing bugs
- **Do not** add new features without approval
- **Do not** access external services or telemetry
- All data stays local on the user's machine
