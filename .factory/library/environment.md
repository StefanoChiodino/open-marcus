# Environment Setup

## Prerequisites

- Python 3.11+
- macOS (target platform)
- 4GB+ RAM (for local AI models)

## Project Structure

```
backend-python/
├── src/
│   ├── main.py           # Flet app + FastAPI
│   ├── models/           # SQLAlchemy models
│   ├── routers/          # FastAPI routes
│   ├── services/         # Business logic
│   └── screens/          # Flet UI screens
├── tests/
├── config/
│   └── prompts.yaml      # Marcus persona prompts
├── models/               # GGUF model files
├── data/                 # SQLite database (encrypted)
└── venv/                 # Python virtual environment
```

## Dependencies

### Core
- `flet>=1.0.0` - UI framework
- `fastapi>=0.100` - Web framework
- `uvicorn` - ASGI server

### Database
- `sqlalchemy>=2.0` - ORM
- `aiosqlite` - Async SQLite driver

### Auth & Security
- `passlib[argon2]` - Password hashing
- `python-jose[cryptography]` - JWT tokens
- `cryptography` - Encryption utilities

### AI/ML
- `llama-cpp-python` - Local LLM inference (with Metal support)
- `faster-whisper` - Speech-to-text
- `piper-tts` - Text-to-speech

### Testing
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `httpx` - HTTP client for tests

### Code Quality
- `ruff` - Linter
- `black` - Formatter
- `mypy` - Type checker

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENMARCUS_PORT` | Backend API port | `8000` |
| `OPENMARCUS_DB_PATH` | Database file path | `./data/openMarcus.db` |
| `OPENMARCUS_MODEL_PATH` | Default LLM model | `./models/` |

## RAM Detection

System detects available RAM on startup using:

```python
import sys
import psutil

def get_ram_gb() -> int:
    return psutil.virtual_memory().total // (1024**3)
```

Recommended model sizes based on RAM:
- 4GB: 2B parameter models
- 8GB: 7B parameter models
- 16GB: 13B parameter models
- 32GB+: 70B parameter models

## Model Management

Models are GGUF files stored in `models/` directory.

Recommended initial models:
- `llama-3.2-1b-instruct-q4_k_m.gguf` - Small, fast
- `llama-3.2-3b-instruct-q4_k_m.gguf` - Balanced
- `llama-3.1-8b-instruct-q4_k_m.gguf` - Higher quality

Download from: https://huggingface.co/models?sort=trending

## Known Issues

### llama-cpp-python on Mac
May need to set environment variable for Metal GPU:
```bash
export LLAMA_METAL=1
```

Or use homebrew openblas:
```bash
brew install openblas
CMAKE_ARGS="-DGGML_OPENBLAS=ON" pip install llama-cpp-python
```
