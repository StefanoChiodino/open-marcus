# AGENTS.md - TTS/STT Settings Mission

## Mission Overview

This mission adds TTS (Text-to-Speech) and STT (Speech-to-Text) settings to the OpenMarcus web app Settings page.

**Scope:**
- TTS Settings: Voice selection (6 curated voices), rate slider, pitch slider
- STT Settings: Model selection from available sherpa-onnx models, hot-reload capability
- Persistence: All settings saved to backend and persist across sessions

## Mission Boundaries (NEVER VIOLATE)

**Port Range:** 3100-3199. Never start services outside this range.

**External Services:**
- USE existing SQLite database at ./data/openmarcus.db (auto-created)
- USE existing Ollama on port 11434 (do not modify)
- USE existing TTS server on port 8766 (edge-tts)
- USE existing STT server on port 8765 (sherpa-onnx)

**Off-Limits:**
- Ports 3000-3010 (user's dev servers)
- /data directory
- Do NOT modify the TTS server (servers/tts/server.py) - only add API endpoints to the Node.js backend that proxy to these servers
- STT server (servers/stt/server.mjs) MAY be modified to implement hot-reload of Whisper models

## Coding Conventions

- Use TypeScript for all frontend and backend code
- Follow existing patterns in Settings.tsx for UI components
- Use Zustand for frontend state management if new state is needed
- Settings API follows RESTful patterns: GET /api/settings, PUT /api/settings
- Backend validation returns 400 with descriptive error messages

## Testing & Validation Guidance

**Unit Tests:**
- backend-worker should run `npm run test -- --grep 'settings|stt|tts'` to verify backend tests
- frontend-worker should run `npm run test` for frontend tests

**Typecheck & Lint:**
- Always run `npm run typecheck` and `npm run lint` before committing

**Manual Testing:**
- Navigate to Settings page and verify TTS and STT sections appear
- Change TTS voice/rate/pitch and verify persistence after refresh
- Reload STT model and verify voice input still works

## Important File Paths

**Backend:**
- `backend/services/settings.ts` - Settings service (extend for TTS/STT)
- `backend/routes/settings.ts` - Settings API routes (add STT endpoints)
- `backend/services/stt.ts` - STT service (add hot-reload method)
- `backend/services/tts.ts` - TTS service

**Frontend:**
- `src/pages/Settings.tsx` - Settings page UI
- `src/lib/settingsApi.ts` - Settings API client
- `src/lib/voiceApi.ts` - Voice API client (TTS/STT calls)
- `src/components/VoiceControls.tsx` - Voice input/output controls
- `src/stores/voiceStore.ts` - Voice state management

## Service Configuration

**TTS Server:** Running on localhost:8766, managed by edge-tts
**STT Server:** Running on localhost:8765, managed by sherpa-onnx
**Backend API:** Running on localhost:3100
**Frontend:** Running on localhost:3101

## Non-Functional Requirements

- TTS settings apply immediately to next voice synthesis
- STT model reload completes within 5 seconds
- Settings persist across browser sessions
- UI shows appropriate loading states and error handling

## Known Pre-Existing Issues (Do Not Fix)

These issues are unrelated to this mission. Workers and validators should note them but not attempt fixes.

- **VAL-TTS-006 and VAL-CROSS-001 blocked**: Home page shows onboarding form repeatedly even after profile creation, preventing access to meditation session. This is a pre-existing state management bug in the HomePage/onboarding flow - NOT related to TTS settings implementation. Discovered during user-testing validation of tts-settings milestone.
