# Architecture

This document describes how the OpenMarcus application works at a high level.

## Components

### Frontend (React + TypeScript)
- **Location:** `/Users/stefano/repos/open-marcus/src`
- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **State:** Zustand for client state, React Query for server state
- **Styling:** CSS modules

**Key Pages:**
- `/` - Home page with welcome greeting
- `/login` - Login screen
- `/register` - Registration screen
- `/session` - Meditation chat with Marcus
- `/history` - Session history list
- `/history/:id` - Session detail
- `/profile` - Profile settings
- `/settings` - App settings

### Backend (Node.js + Express)
- **Location:** `/Users/stefano/repos/open-marcus/backend`
- **Framework:** Express.js with TypeScript
- **Database:** PostgreSQL with better-sqlite3
- **Auth:** JWT tokens with argon2 password hashing

**Key API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET/POST /api/profile` - Profile management
- `GET/POST /api/sessions` - Session management
- `GET /api/sessions/:id` - Session detail
- `GET/PUT /api/settings` - Settings management
- `POST /api/export/clear` - Clear all user data

### External Services

**Ollama (LLM)**
- Runs on `localhost:11434`
- Provides AI responses from Marcus Aurelius model

**STT Server (Speech-to-Text)**
- Runs on `localhost:8765`
- sherpa-onnx Whisper for transcription

**TTS Server (Text-to-Speech)**
- Runs on `localhost:8766`
- edge-tts for voice synthesis

## Data Flow

1. User registers/logs in → JWT token stored in localStorage
2. Profile created → stored in PostgreSQL
3. Meditation session → messages sent to Ollama → responses streamed back
4. Session saved → stored with messages in PostgreSQL
5. History → loaded from PostgreSQL

## State Management

**Zustand Stores:**
- `authStore` - Authentication state (token, user)
- `profileStore` - User profile
- `voiceStore` - Voice settings
- `ttsSettingsStore` - TTS configuration

**React Query:**
- Used for server state (sessions, settings)
- Provides caching and background refetching

## Key User Flows

### Registration → Onboarding → Session
1. User registers at `/register`
2. JWT stored, redirected to `/`
3. If no profile, onboarding form shown
4. Profile created, redirected to home
5. Click "Begin Meditation" → `/session`
6. Click "Begin Meditation" → active session with Marcus

### Session → History
1. User sends messages to Marcus
2. Marcus responds via Ollama streaming
3. User clicks "End Session"
4. Summary generated
5. Session saved to database
6. User navigates to `/history`
7. Session appears in list
