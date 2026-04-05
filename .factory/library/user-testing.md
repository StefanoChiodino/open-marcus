# User Testing

## Validation Surface

### Primary Surface: Browser UI (agent-browser)

All user-facing features should be validated through the browser using `agent-browser`.

**Setup Required**:
1. Start backend: `PORT=3100 npx tsx backend/server.ts` (must use tsx, NOT npm run dev:backend)
2. Start frontend: `PORT=3101 npm run dev:frontend`
3. Ensure Ollama is running with a model loaded (for core features)

**IMPORTANT**: The backend MUST be started with `npx tsx`, not `node` or `npm run dev:backend`, because the server imports TypeScript modules with `.js` extensions (ESM convention). Plain Node.js cannot resolve `.js` to `.ts` files.

**Test URLs**:
- Frontend: http://localhost:3101
- Backend API: http://localhost:3100

### Secondary Surface: API (curl)

Backend API endpoints can be tested directly with curl.

**Health Check**:
```bash
curl http://localhost:3100/health
```

## Validation Concurrency

**Recommended Max Concurrent Validators**: 2

**Rationale**:
- React frontend is lightweight (~300MB per instance)
- Backend API adds minimal overhead (~100MB)
- Ollama is shared across validators (can be resource-constrained)
- Voice features may have audio conflicts if tested simultaneously

**Resource Consumption**:
- Dev server: ~200MB RAM
- Agent-browser instance: ~300MB RAM
- Total for 2 validators: ~1GB RAM
- On 64GB machine: well within capacity

## Testing Workflow

### 1. Pre-flight Check
```bash
# Start backend: MUST use tsx (not plain node) for TypeScript+ESM support
PORT=3100 npx tsx backend/server.ts

# Start frontend
PORT=3101 npm run dev:frontend

# Or use: npm run dev (starts frontend only, backend needs separate tsx)

# Verify services
curl http://localhost:3100/health
curl http://localhost:3101
```

### 2. Functional Testing
Use agent-browser to:
- Complete onboarding flow
- Start and complete meditation session
- Verify session persistence
- Test voice features (manual)

### 3. API Testing
Use curl to:
- Verify endpoint contracts
- Test error conditions
- Check data persistence

### 4. Accessibility Testing
- Tab navigation
- Screen reader announcements
- Color contrast

## Known Constraints

### Voice Features
- Require microphone permission (manual testing recommended)
- TTS quality is subjective (manual verification)
- STT accuracy varies by accent/voice

### Ollama Dependency
- Some tests require Ollama to be running
- If Ollama is offline, verify appropriate error messages
- Mock responses not used - real integration required

### First-run Experience
- Database created on first backend start at `data/openmarcus.db`
- No existing data for fresh tests
- Clear data feature available in Settings page for test reset

## Flow Validator Guidance: Browser UI

**Testing surface**: agent-browser against http://localhost:3101

**Isolation rules**:
- All validators share the same browser instance and SQLite database
- DO NOT run validators that depend on different data states concurrently
- Profile tests and session tests share global app state — if one validator clears data, it breaks others
- Sequential test groups within a single subagent is the safest approach for shared-state assertions

**App structure**:
- Home page: `/` - meditation session page
- Profile page: `/profile` - profile settings
- History page: `/history` - past sessions list
- Settings page: `/settings` - data export/import/clear
- Onboarding: Shows automatically when no profile exists

**Profile creation flow**:
1. Navigate to http://localhost:3101
2. If no profile exists, onboarding screen appears
3. Enter name, save
4. After save, you're redirected to home

**API endpoints**:
- GET/POST/PUT/DELETE `/api/profile` - profile CRUD (PUT requires `id` in body)
- GET `/api/sessions` - session list (returns with message_count, first_message)
- POST `/api/sessions` - create session (body: `{profile_id: "uuid"}`)
- POST `/api/sessions/:id/messages` - add message (body: `{role: "user"|"assistant", content: "..."}`)
- PUT `/api/sessions/:id/end` - end session (body: `{summary: "...", action_items: [...]}`)
- GET `/api/sessions/:id` - single session with messages
- GET `/api/content/quotes` - stoic quotes
- GET `/api/export` - export all data as JSON (GET, not POST)
- POST `/api/export/import` - import data (body: export JSON)
- POST `/api/export/clear` - clear all data (no confirmation needed server-side)

**Known issues during testing**:
- Ollama may not be running - core meditation features requiring AI will fail, but UI features, profile, history, and data management should still be testable
- The app proxies `/api` requests to backend on port 3100 via Vite dev server
- Backend session.ts has ESM compatibility issue with `require` - fix: add `import { createRequire } from 'module'; const require = createRequire(import.meta.url);` at top of file
- Clear all data does not require confirmation server-side; frontend shows confirmation dialog before calling API
