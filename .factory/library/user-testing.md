# User Testing

## Validation Surface

### Primary Surface: Browser UI (agent-browser)

All user-facing features should be validated through the browser using `agent-browser`.

**Setup Required**:
1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Ensure Ollama is running with a model loaded

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
# Start required services
npm run dev

# Verify Ollama is running
curl http://localhost:11434/api/tags
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
- Database created on first backend start
- No existing data for fresh tests
- Clear data feature available for test reset
