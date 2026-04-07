# Environment

Environment variables, external dependencies, and setup notes for OpenMarcus.

## Environment Variables

**Backend:**
- `PORT` - Backend server port (default: 3100)
- `JWT_SECRET` - Secret for JWT token signing

**Frontend:**
- `PORT` - Frontend dev server port (default: 3101)
- `VITE_API_URL` - Backend API URL

**External Services:**
- `OLLAMA_HOST` - Ollama server URL (default: localhost:11434)
- `STT_SERVER_URL` - STT server URL (default: localhost:8765)
- `TTS_SERVER_URL` - TTS server URL (default: localhost:8766)

## External Dependencies

### Required
- **SQLite** - Local database via better-sqlite3 (no external DB needed)
- **Node.js** - For backend and frontend dev

### Optional (app works without but features limited)
- **Ollama** - On localhost:11434 (AI responses)
- **STT Server** - On localhost:8765 (voice input)
- **TTS Server** - On localhost:8766 (voice output)

## Setup Notes

### First Time Setup

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install chromium

# Start backend (creates SQLite DB automatically on first run)
PORT=3100 npx tsx backend/server.ts &

# Start frontend
PORT=3101 npm run dev:frontend &
```

### Database Setup

The backend uses SQLite via better-sqlite3. Database file is created automatically at:
- `./data/openmarcus.db` (relative to project root)

No external database server needed - SQLite stores data locally in a single file.

### External Services

**Ollama:**
```bash
# Pull the model
ollama pull llama3.2

# Or use gemma4 if that's what's configured
ollama pull gemma4
```

**STT Server:**
```bash
cd servers/stt
node server.mjs --port 8765
```

**TTS Server:**
```bash
cd servers/tts
python3 server.py --port 8766
```

## Port Configuration

| Service | Default Port |
|---------|-------------|
| Backend API | 3100 |
| Frontend | 3101 |
| Ollama | 11434 |
| STT | 8765 |
| TTS | 8766 |

## Platform Notes

**macOS:**
- Uses `lsof -ti :PORT | xargs kill` for stopping services

**Linux:**
- May need `fuser -k PORT/tcp` instead of `lsof`
