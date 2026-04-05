# Frontend UI Patterns

## Icon System
- All components use **inline SVG** elements rather than an icon library
- No external icon dependencies (no react-icons, heroicons, etc.)
- SVGs are embedded directly in JSX components

## Ancient Rome Aesthetic
- **Color palette**: warm stone tones (cream, tan, muted gold, charcoal)
- **Fonts**: serif fonts (Playfair Display, Merriweather)
- **CSS custom properties**: `--color-*`, `--text-*`, `--space-*`
- Files: `src/styles/globals.css`, component-specific CSS modules

## Test Database Pattern
- Test databases use UUID-based naming for isolation: `test-data/<test-name>-<UUID>.db`
- Pattern prevents test interference across parallel runs
- Example: `test-data/chat-route-test-${randomUUID()}.db`
- Databases should be cleaned up after tests

## Ollama Health Check
- Ollama connectivity is verified via `/api/tags` endpoint
- This endpoint returns available models and confirms the server is responding
- Used as the `isOnline()` check in OllamaService
