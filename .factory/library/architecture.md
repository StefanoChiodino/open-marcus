# Architecture

OpenMarcus is a local-first web application that provides stoic mental health guidance through an AI-powered Marcus Aurelius persona.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Browser (React SPA)                    │
│     ┌─────────────────────────────────────────────┐     │
│     │  Profile UI  │  Meditation UI  │  History  │     │
│     └─────────────────────────────────────────────┘     │
│                         │                                 │
│              HTTP/WebSocket                              │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   Backend API (Node.js)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │ Profile  │ │ Session  │ │   Chat   │ │   Content │   │
│  │ Service  │ │ Service  │ │ Service  │ │  Service  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘   │
│       │            │            │              │          │
│  ┌────▼────────────▼────────────▼──────────────▼────┐   │
│  │              SQLite Database (Encrypted)           │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │ STT Proxy         │ LLM Proxy          │ TTS Proxy
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  STT Server │      │    Ollama   │      │  TTS Server │
│  (sherpa)   │      │   (LLM)    │      │ (edge-tts) │
│  Port 8765  │      │  Port 11434│      │  Port 8766 │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Key Components

### Frontend (React)
- **Single Page Application** using React Router
- **State Management**: Zustand stores for UI state
- **Styling**: CSS Modules with ancient Rome aesthetic
- **Voice IO**: Web Audio API for recording, HTML5 Audio for playback

### Backend (Node.js + Express)
- **RESTful API** for all operations
- **Streaming responses** for LLM chat (ndjson)
- **SQLite** for persistent storage
- **Encryption** using Node.js crypto module (AES-256-GCM)

### Data Storage
- **Profiles**: User information (name, bio)
- **Sessions**: Meditation session metadata
- **Messages**: Individual messages within sessions
- **Action Items**: Commitments from sessions
- **All data encrypted at rest**

### External Services
- **Ollama**: Local LLM inference
- **Sherpa-onnx**: Speech-to-text (Whisper)
- **Edge-tts**: Text-to-speech synthesis

## Data Flow: Meditation Session

1. User clicks "Begin Meditation"
2. Frontend calls `POST /api/sessions` → creates session
3. Frontend displays Marcus greeting (from AI)
4. User types/speaks message
5. Frontend sends to `POST /api/chat` (streaming)
6. Backend proxies to Ollama, streams response back
7. Messages stored in database after each exchange
8. User clicks "End Session"
9. Backend generates summary, extracts action items
10. Summary displayed, session marked complete

## Security Model

- **Local-only**: No external network calls
- **Encrypted storage**: AES-256-GCM encryption
- **No cloud sync** in initial version
- **Future**: Encrypted sync with user-controlled keys

## Session State Machine

```
[CREATED] → [ACTIVE] → [CLOSING] → [COMPLETED]
                ↓
            [PAUSED]
```

- **CREATED**: Session initialized, waiting for first message
- **ACTIVE**: Conversation in progress
- **PAUSED**: User paused mid-conversation
- **CLOSING**: Marcus initiating session wrap-up
- **COMPLETED**: Summary generated, session archived
