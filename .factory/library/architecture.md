# Architecture

How the OpenMarcus system works: components, relationships, data flows, invariants.

---

## System Overview

OpenMarcus is a Flet desktop/mobile application with a FastAPI backend.

```
┌─────────────────────────────────────────┐
│           Flet Desktop App               │
│  (src/main.py, src/screens/)            │
│                                          │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  │
│  │  Lock   │  │  Login   │  │  ...   │  │
│  │ Screen  │  │  Screen  │  │        │  │
│  └────┬────┘  └────┬─────┘  └────────┘  │
│       │            │                      │
│       └────────────┼──────────────────┐   │
│                    │                   │   │
│              ┌─────▼─────┐            │   │
│              │ APIClient │─────────────┼───┘
│              └─────┬─────┘            │
└────────────────────┼──────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────┐
│         FastAPI Backend                   │
│  (src/api.py, src/routers/)             │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth    │  │  Profile │  │Session │ │
│  │  Router  │  │  Router  │  │ Router │ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │            │       │
│       └─────────────┼────────────┘       │
│                     │                   │
│              ┌──────▼──────┐            │
│              │DatabaseService│           │
│              └──────┬──────┘            │
└─────────────────────┼───────────────────┘
                      │ SQLAlchemy
                      ▼
              ┌───────────────┐
              │    SQLite     │
              │ (encrypted)   │
              └───────────────┘
```

## Components

### Flet Screens (src/screens/)

Each screen is a class that builds a `ft.View`:

| Screen | Route | Purpose |
|--------|-------|---------|
| LockScreen | /lock | Master password setup/unlock |
| LoginScreen | /login | User authentication |
| RegisterScreen | /register | New user registration |
| OnboardingScreen | /onboarding | Profile creation for new users |
| HomePage | /home | Dashboard with profile display |
| ProfilePage | /profile | Edit existing profile |
| SessionPage | /session | Meditation chat interface |
| HistoryPage | /history | Past sessions list |
| SessionDetailPage | /session/{id} | Individual session view |
| SettingsPage | /settings | App configuration |

### Navigation (src/screens/navigation.py)

- `NavigationSidebar` - `ft.NavigationRail` component
- 4 destinations: Home, History, Settings, Profile
- Leading: CircleAvatar with "M" logo
- Trailing: Logout IconButton

### API Client (src/services/api_client.py)

- `APIClient` singleton
- JWT token stored in `self.token`
- Methods: `login()`, `register()`, `get_profile()`, `create_profile()`, `update_profile()`, `create_session()`, `stream_message()`, `end_session()`, `list_sessions()`, `get_session()`, `get_settings()`, `update_settings()`, `export_data()`, `clear_all_data()`

### Backend API (src/api.py)

FastAPI application with routers:
- `/api/auth/*` - Authentication (register, login)
- `/api/profile` - Profile CRUD
- `/api/sessions/*` - Session management
- `/api/settings` - App settings
- `/api/system/*` - System info

### Database Models (src/models/)

SQLAlchemy 2.0 async models:
- `User` - username, hashed_password
- `Profile` - user_id, name, goals, experience_level
- `Session` - user_id, state (intro/active/concluded), summary
- `Message` - session_id, role, content
- `PsychUpdate` - session_id, emotional_state, keywords
- `SemanticAssertion` - session_id, assertion_text, category
- `Settings` - user_id, tts_voice, stt_enabled, selected_model

### Services (src/services/)

- `auth.py` - JWT generation, password hashing (argon2id)
- `database.py` - SQLAlchemy session management
- `encryption.py` - Fernet AES-256 encryption
- `password_lock.py` - Master password service
- `session.py` - Session business logic
- `persona.py` - Marcus Aurelius persona prompt building
- `llm.py` - LLM inference (llama-cpp-python)
- `stt.py` - Speech-to-text (faster-whisper)
- `tts.py` - Text-to-speech (piper-tts)

## Data Flows

### Login Flow
1. User enters credentials on LoginScreen
2. `api_client.login()` POSTs to `/api/auth/login`
3. Backend validates, returns JWT
4. Token stored in `api_client.token`
5. Check profile: if none → `/onboarding`, else → `/home`

### Session Flow
1. User clicks "Begin Meditation" → `/session`
2. `api_client.create_session()` creates session (state=intro)
3. User sends message → `api_client.stream_message()`
4. Backend streams LLM response
5. User clicks Stop → `api_client.end_session()`
6. Session state = concluded, summary generated
7. Navigate to `/home`

### Data Encryption
- Master password derives encryption key via PBKDF2
- Database encrypted at rest via Fernet (AES-256)
- Passwords hashed via argon2id
- JWT for stateless auth

## Testing Structure

```
src/tests/
├── unit/           # pytest unit tests (existing)
├── e2e/            # NEW: Playwright E2E tests
│   ├── conftest.py
│   ├── test_lock_screen.py
│   ├── test_login_screen.py
│   └── ...
└── test_*.py      # Existing integration tests
```

## Key Invariants

1. All API calls require valid JWT (except /auth/*)
2. Session state machine: intro → active → concluded (never backwards)
3. Profile must exist before accessing /home
4. Master password must be set before using app
5. All sensitive data encrypted at rest
