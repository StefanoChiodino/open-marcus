# OpenMarcus

A private, local-first AI mental health companion built with Python/Flet.

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
├── main.py              # Flet app entry point
├── api.py               # FastAPI backend
├── screens/            # Flet UI screens
├── services/            # Business logic
├── routers/             # API routes
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── tests/               # Unit tests (380+ passing)
├── venv/                # Python virtual environment
├── docs/                # Documentation
├── data/                # Runtime data (encrypted DB, models)
└── scripts/            # Utility scripts
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
flet run
```

## Development

```bash
source venv/bin/activate
pytest      # Run tests
mypy        # Type check
ruff check  # Lint
```

## Privacy

- All data encrypted at rest (AES-256 via Fernet)
- No telemetry, analytics, or external network requests
- App password protects access to your data
- Export/delete all data anytime from settings

## License

MIT
