# UI Fix Mission

## Plan Overview
Fix all critical UI bugs and UX issues in OpenMarcus. The app has broken pages (wrong content rendering), mobile navigation covering content, CSS file conflicts, excessive duplicate content, and poor responsive design.

## Milestones

### Milestone: ui-fix
All UI bugs and UX issues fixed and validated at all breakpoints (375px, 768px, 1024px, 1280px).

## Infrastructure

**Services:**
- Frontend: http://localhost:3101 (PORT=3101)
- Backend: http://localhost:3100 (PORT=3100)
- Ollama: localhost:11434 (optional for AI)

**Ports:** 3100-3199 available

**Off-Limits:**
- Backend routes and services - UI only
- Data models and API contracts
- New features beyond bug fixes

## Testing Strategy

- Manual browser testing with agent-browser at all breakpoints
- Visual screenshots before/after each fix
- `npm run typecheck` and `npm run lint` must pass
- `npm run test` must pass (existing tests)

## Validation Contract
See `validation-contract.md` for all behavioral assertions.

## Key Issues to Fix

1. Session page shows home page content (desktop)
2. Mobile bottom nav covers content
3. Profile page empty on mobile
4. History page shows settings content on mobile
5. Multiple nav items active simultaneously
6. CSS file conflicts (App.css vs HomePage.css)
7. Duplicate branding (4x) and disclaimer (3x)
8. Desktop layout wastes 65% of viewport
9. Card-within-card nesting
10. Button style inconsistency
11. Text hierarchy confusion
12. Settings page routing on mobile
13. Onboarding mobile layout
14. Session detail mobile layout
