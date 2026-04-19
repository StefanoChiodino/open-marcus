# OpenMarcus Architecture

## Overview

OpenMarcus is a mental well-being app with a Marcus Aurelius persona that runs entirely locally with no telemetry.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLET UI LAYER (Python)                       │
│  Screens: Login, Register, Onboarding, Home, Session, History   │
│  State: AppState (user, profile, current session)               │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                 FASTAPI BACKEND (Python)                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Router  │  │Session Router│  │Settings Router│         │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐        │
│  │                  SERVICES LAYER                       │        │
│  │  AuthService  │  SessionService  │  MemoryService   │        │
│  │  LLMSevice    │  STTService     │  TTSService      │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐        │
│  │                 DATA LAYER (SQLAlchemy)              │        │
│  │  User │ Profile │ Session │ Message │ PsychUpdate   │        │
│  └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL SERVICES                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ llama-cpp  │  │faster-whisper│ │  piper-tts  │             │
│  │  (LLM)     │  │   (STT)     │  │   (TTS)     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### User & Auth
- **User**: id, username, password_hash, created_at
- **Password**: Derived from master password, encrypts database

### Profile & Journey
- **Profile**: id, user_id, name, goals, experience_level, created_at
- **Session**: id, user_id, state (intro/active/concluded), created_at, summary
- **Message**: id, session_id, role, content, created_at, psych_update_id

### Memory System (Mental Health Journey)
- **PsychUpdate**: id, message_id, detected_patterns, emotional_state, stoic_principle, suggested_direction, confidence
- **SemanticAssertion**: id, user_id, source_message_id, text, confidence, created_at

### Settings
- **Settings**: id, user_id, selected_model, tts_voice, stt_enabled, ram_detected

## Key Patterns

### Memory Context Building
Before each AI response, build context from:
1. User profile (name, goals, experience)
2. Semantic assertions (facts about user)
3. Recent emotional states
4. Past conversation highlights

### PsychUpdate Flow
After each AI response:
1. Generate response with Marcus persona
2. Extract psych_update (detected patterns, emotional state)
3. Extract semantic assertions (0-3 facts)
4. Store both in database
5. Inject accumulated context into next prompt

### Model Selection by RAM
| RAM | Recommended Model | Size |
|-----|-----------------|------|
| 4GB | Qwen2-0.5B | ~1GB |
| 8GB | Phi-3-mini | ~4GB |
| 16GB | Llama-3.2-7B | ~8GB |
| 32GB+ | Llama-3.1-13B | ~16GB |

## Security Model

- Master password → argon2 → database encryption key
- JWT for API authentication
- No third-party network calls except model downloads
- All data local, encrypted at rest

## Reference Implementations

- **Stoic Emperor**: `/Users/stefano/repos/stoic-emperor/src/core/emperor_brain.py`
- **Memory Architecture**: `/Users/stefano/repos/aigent/docs/memory-architecture.md`
