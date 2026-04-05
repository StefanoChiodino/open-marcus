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
