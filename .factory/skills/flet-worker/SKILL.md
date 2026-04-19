---
name: flet-worker
description: Flet UI development for OpenMarcus - Python desktop/mobile app
---

# Flet Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features that involve:
- Flet UI screens and components
- Navigation and routing
- User input forms and validation
- Loading and error states
- Responsive layouts

## Required Skills

- Python 3.11+
- Flet framework (ft.Container, ft.Column, ft.Text, etc.)
- Basic understanding of async/await

## Work Procedure

### 1. Read Mission Context
- Read mission.md and AGENTS.md for mission requirements
- Read validation-contract.md for testable behaviors
- Review existing React patterns in /Users/stefano/repos/open-marcus/src/ for reference

### 2. Set Up Environment
```bash
cd /Users/stefano/repos/open-marcus/backend-python
source venv/bin/activate
```

### 3. Implement Feature

**Screen Structure:**
```python
import flet as ft

class HomePage:
    def __init__(self, app):
        self.app = app
    
    def build(self) -> ft.View:
        return ft.View(
            route="/",
            controls=[
                ft.AppBar(title=ft.Text("OpenMarcus")),
                ft.Column([
                    ft.Text("Welcome", size=24),
                    ft.ElevatedButton("Begin Meditation", on_click=self.start_session),
                ]),
            ],
        )
```

**Navigation:**
```python
# In main.py
def main(page: ft.Page):
    page.add(
        ft.NamedView("/home", HomePage(app).build),
        ft.NamedView("/session", SessionPage(app).build),
        # ...
    )
    page.route = "/home"
```

**State Management:**
```python
class AppState:
    def __init__(self):
        self.user = None
        self.profile = None
        self.current_session = None
    
    def load_from_storage(self):
        # Load persisted state
        pass
```

**API Integration:**
```python
import httpx

class APIClient:
    BASE_URL = "http://localhost:8000"
    
    async def login(self, username: str, password: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/api/auth/login",
                json={"username": username, "password": password}
            )
            return response.json()
```

### 4. Write Tests
```bash
pytest tests/ -v
# Or use flet_test for UI tests
```

### 5. Verify Implementation
- Run app: `flet run`
- Test navigation between screens
- Verify forms validate correctly
- Check loading states appear
- Test error handling

### 6. Commit with Evidence

## Screen List

| Screen | Route | Purpose |
|--------|-------|---------|
| LoginScreen | /login | User authentication |
| RegisterScreen | /register | New user registration |
| OnboardingScreen | /onboarding | Profile creation |
| HomePage | /home | Welcome, profile display, start session |
| SessionPage | /session | Meditation chat interface |
| HistoryPage | /history | Past sessions list |
| SessionDetailPage | /session/:id | Single session view |
| SettingsPage | /settings | App configuration |

## UI Patterns

### Form Input
```python
ft.TextField(
    label="Username",
    on_change=self.validate_username,
    error_text=self.username_error if self.username_error else None,
)
```

### Loading State
```python
ft.Column([
    ft.ProgressRing(),
    ft.Text("Loading..."),
])
```

### Error Display
```python
ft.Container(
    content=ft.Text("Error message", color=ft.colors.ERROR),
    visible=self.has_error,
)
```

### Card Component
```python
ft.Card(
    content=ft.Container(
        padding=10,
        content=ft.Column([
            ft.Text("Title"),
            ft.Text("Description"),
        ]),
    ),
)
```

## Common Issues

1. **Navigation not working**: Ensure routes are registered with ft.NamedView
2. **State not persisting**: Use ft.ClientStorage or backend API
3. **Async issues**: Use async/await for API calls, update UI in on_result

## When to Return to Orchestrator

- Need clarification on screen requirements
- Backend API doesn't exist yet for feature
- Flet control behavior unexpected
- Need additional dependencies
