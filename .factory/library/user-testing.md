# User Testing Surface

## Testing Approach

This document describes how user testing is performed for OpenMarcus Flet rewrite.

## Test Tool

**Flet App Testing**
- Run: `flet run` launches the app
- Use `agent-browser` for web-based testing if Flet web target used
- Use `tuistory` for terminal-based verification

## Validation Surfaces

### Authentication Flow
1. Fresh app launch → Password creation prompt
2. Login with credentials → Home screen
3. Invalid login → Error message
4. Logout → Return to login

### Profile/Onboarding
1. Complete onboarding form
2. View profile on home
3. Edit profile → Changes persist

### Meditation Session
1. Click "Begin Meditation" → Session created
2. Send first message → State transitions to active
3. Receive AI response → Tokens stream
4. End session → Summary generated

### Memory System
1. Share personal info in session
2. Return next day
3. AI references past conversation

### Speech
1. Click microphone → Record audio
2. Audio transcribed to text
3. Click TTS → Hear Marcus speak

### Settings
1. Change model → Different responses
2. Export data → JSON file created
3. Clear data → App returns to fresh state

## Resource Cost Classification

| Surface | Testing Cost | Notes |
|---------|-------------|-------|
| Auth | Low | API-based, fast |
| Profile | Low | API-based, fast |
| Session Chat | Medium | LLM inference, depends on model speed |
| Memory | Medium | LLM inference, multi-turn testing |
| Speech | High | Requires microphone, longer tests |
| Settings | Low | API-based, fast |
| Privacy | Medium | Code inspection + runtime verification |

## Critical Test Paths

### Complete Journey
1. Register → Onboard → First Session → View History → Return Next Day

### Memory Continuity
1. Session 1: Share "I have a presentation tomorrow"
2. Session 2: Ask "What should I focus on today?"
3. Verify AI knows about presentation

### Privacy Verification
1. Inspect network traffic during use
2. Verify no external API calls
3. Check database is encrypted
