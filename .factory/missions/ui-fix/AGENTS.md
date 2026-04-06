# UI Fix Mission - Agent Guidance

## Mission Overview
Fix all critical UI bugs and UX issues identified in the comprehensive UI review. The app has multiple broken pages, wrong content showing, mobile navigation covering content, and visual design issues.

## Mission Boundaries

**Port Range:** 3100-3199. Frontend dev server uses 3101, backend uses 3100.

**External Services:**
- Ollama on localhost:11434 (optional - AI responses will fail but UI should still work)
- STT server on localhost:8765
- TTS server on localhost:8766

**Off-Limits:**
- Do not modify backend routes or services (this is a UI-only mission)
- Do not modify data models or API contracts
- Do not add new features - only fix existing UI bugs

## Testing & Validation

### How to test each fix:
1. Start services: `PORT=3100 npx tsx backend/server.ts &` then `PORT=3101 npm run dev:frontend`
2. For each fix feature, take annotated screenshots at:
   - Desktop: 1280px width
   - Tablet: 768px width  
   - Mobile: 375px width (iPhone 12)
3. Verify correct content on each page at each breakpoint
4. Run `npm run typecheck` and `npm run lint` after each feature

### Key routes to verify:
- `/` - Home page
- `/session` - Meditation chat
- `/history` - Session history
- `/profile` - Profile settings
- `/settings` - App settings
- `/onboarding` - Profile creation

### Common pitfalls:
- Do NOT use `@media (max-width: 768px)` and `@media (min-width: 768px)` both as exclusive ranges - ensure no gap
- Do NOT add duplicate CSS classes in multiple files
- Do NOT hardcode widths - use max-width with percentage or viewport-relative units
- Do NOT forget to test at ALL breakpoints after every change

## CSS Conventions
- Breakpoints: Mobile < 768px, Tablet 768-1199px, Desktop 1200px+
- Use CSS variables from the design system
- No inline styles for layout
- All interactive elements must have visible focus states

## Known Pre-Existing Issues (Do Not Fix)
- Model mismatch (gemma4 vs llama3.2): AI responses fail but UI handles gracefully
- E2e tests have hardcoded waits - not blocking
- SkipLink uses :focus instead of :focus-visible
