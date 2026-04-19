# OpenMarcus

A private, local-first AI mental health companion built with Python.

## Overview

OpenMarcus is a desktop application for mental health journaling and AI-assisted reflection. It runs entirely locally on your machine - no cloud services, no data collection, no external API dependencies.

### Key Features

- **Private by design**: All data encrypted at rest, no telemetry
- **Local AI**: Uses llama-cpp-python for LLM inference (supports GGUF models)
- **Voice I/O**: Speech-to-text with faster-whisper, text-to-speech with piper-tts
- **Memory system**: Tracks your mental health journey over time
- **Cross-platform**: Runs on macOS, Windows, and Linux via Flet

## Architecture

```
open-marcus/
├── backend-python/          # Python/Flet application
│   ├── src/
│   │   ├── main.py         # Flet app entry point
│   │   ├── api.py          # FastAPI backend
│   │   ├── screens/       # Flet UI screens
│   │   ├── services/      # Business logic
│   │   ├── routers/       # API routes
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── tests/             # Unit tests (380+ passing)
│   └── venv/              # Python virtual environment
├── docs/                  # Documentation
├── data/                  # Runtime data (encrypted DB, models)
├── test-data/             # Test fixtures
└── scripts/              # Utility scripts
```

## Setup

### Prerequisites

- Python 3.9+
- At least 8GB RAM (16GB recommended for larger models)

### Installation

```bash
cd backend-python
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### First Run

1. Start the backend server:
   ```bash
   uvicorn src.api:app --reload --port 8000
   ```

2. In another terminal, launch the Flet app:
   ```bash
   flet run src/main.py
   ```

### First-Time Setup

1. Create an app password on first launch (protects your data)
2. Register an account with username/email/password
3. Complete the onboarding questionnaire
4. Download your first AI model when prompted

## Development

### Running Tests

```bash
cd backend-python
source venv/bin/activate
pytest
```

### Type Checking

```bash
mypy src/
```

### Linting

```bash
ruff check src/
```

## Data Storage

All data is stored locally in `backend-python/data/`:
- `openmarcus.db` - Encrypted SQLite database
- `models/` - Downloaded AI models (GGUF format)

## Privacy

OpenMarcus is designed with privacy as a core principle:
- All data encrypted at rest (AES-256 via Fernet)
- No external network requests for data processing
- No telemetry, analytics, or crash reporting
- App password protects access to your data
- Export/delete all data anytime from settings

## Documentation

See `docs/` for detailed documentation:
- [Memory Management](./docs/MEMORY-MANAGEMENT.md) - How context and memory work
- [Stoic Emperor Memory System](./docs/STOIC-EMPEROR-MEMORY.md) - Reference architecture

## License

MIT
