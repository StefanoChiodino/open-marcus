# Environment

Environment variables, external dependencies, and setup notes.

## Required Environment Variables

```bash
# Backend server port
PORT=3100

# Frontend dev server port  
FRONTEND_PORT=3101

# Ollama configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Database
DATABASE_PATH=./data/openmarcus.db

# Encryption key (user-provided or derived)
ENCRYPTION_KEY=your-32-byte-key-here
```

## External Services

### Ollama
- **Default Port**: 11434
- **Setup**: Install from https://ollama.com
- **Recommended Models**: 
  - `llama3.2:latest` (general purpose)
  - `qwen3.5:14b` (better instruction following)
  - For Apple Silicon: MLX optimized versions

### Sherpa-onnx (STT)
- **Port**: 8765
- **Setup**: `node stt/server.mjs`
- **Requires**: Whisper model in `stt/` directory

### Edge-tts (TTS)
- **Port**: 8766
- **Setup**: `python3 tts/main.py`
- **No API key required** - uses Microsoft's edge TTS

## Platform Notes

### macOS
- Ollama with Metal GPU acceleration recommended
- Microphone permissions required for voice input
- Full Apple Silicon support with MLX

### Linux
- Standard Ollama build
- PulseAudio or PipeWire for audio

### Windows
- WSL2 recommended for Ollama
- Standard audio stack support

## Database

- **Location**: `./data/openmarcus.db`
- **Type**: SQLite 3
- **Encryption**: AES-256-GCM
- **Auto-migration**: Runs on server startup

## Development Logging

### Environment Modes
```bash
NODE_ENV=development   # Verbose file logging enabled
NODE_ENV=production    # All logging disabled (zero overhead)
```

### Log Files (development only)
- `./data/logs/auth.log` - Authentication events
- `./data/logs/api.log` - HTTP request/response logs
- `./data/logs/db.log` - Database query logs
- `./data/logs/error.log` - Error and exception logs
- `./data/logs/app.log` - General application logs

### What Gets Logged (Development)
- Auth events (login, logout, session creation/destruction)
- All API requests (method, path, query params, status, timing)
- All database queries (sanitized - no message content)
- Errors with full stack traces and correlation IDs

### What NEVER Gets Logged
- Message content (user messages, AI responses)
- Auth tokens, passwords, credentials
- Personal identifiable information
