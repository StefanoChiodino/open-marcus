# TTS/STT Settings Mission

## Plan Overview

Add TTS (Text-to-Speech) and STT (Speech-to-Text) settings to the OpenMarcus web app Settings page.

**TTS Settings:**
- Voice selection from 6 curated English neural voices (GuyNeural, ChristopherNeural, BrianNeural, ThomasNeural, JennyNeural, MichelleNeural)
- Rate slider (-50% to +100%, default +25%)
- Pitch slider (-50Hz to +50Hz, default +0Hz)
- Persisted to backend API

**STT Settings:**
- Model selection dropdown listing available sherpa-onnx models in servers/stt/
- Hot-reload API endpoint (swaps model without server restart)
- Progress/error feedback during model reload
- Size warning when switching to larger models

## Milestones

### Milestone: tts-settings
TTS settings (voice, rate, pitch) fully implemented and validated.

### Milestone: stt-settings
STT settings (model selection, hot-reload) fully implemented and validated.

## Infrastructure

**Services:**
- Backend API: localhost:3100
- Frontend: localhost:3101
- Ollama: localhost:11434
- STT server: localhost:8765
- TTS server: localhost:8766

**Ports:** 3100-3199 available

**Off-Limits:**
- Do NOT modify TTS server (servers/tts/server.py) or STT server (servers/stt/server.mjs)
- Only add API endpoints to Node.js backend that proxy to these servers

## Testing Strategy

- Unit tests for settings service (backend)
- Component tests for Settings page (frontend)
- Integration tests for settings API
- Manual browser testing with agent-browser

## Validation Contract
See `validation-contract.md` for all behavioral assertions.
