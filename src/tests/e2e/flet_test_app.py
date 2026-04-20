"""
Minimal Flet app for E2E testing.
Only includes the lock screen to avoid heavy dependencies.
"""

import sys
from pathlib import Path

# Add parent of parent to path so 'src' becomes a proper package
# __file__ is src/tests/e2e/flet_test_app.py
# parent.parent.parent.parent = repo root
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

import flet as ft

from src.screens.lock_screen import PasswordLockScreen


class TestApp:
    """Minimal app for testing lock screen."""
    
    def __init__(self, page: ft.Page):
        self.page = page
        self.lock_screen = PasswordLockScreen(self)
        self.setup_routes()
    
    def setup_routes(self) -> None:
        """Register routes."""
        self.page.on_route_change = self.route_change
        # Start at lock screen
        self.page.go("/lock")
    
    def route_change(self, route: ft.RouteChangeEvent) -> None:
        """Handle route changes."""
        self.page.views.clear()
        
        if self.page.route == "/lock":
            self.page.views.append(self.lock_screen.build())


def main(page: ft.Page) -> None:
    """Application entry point for testing."""
    TestApp(page)


if __name__ == "__main__":
    # Get port from environment or use default
    import os
    port = int(os.environ.get("FLET_PORT", 3100))
    
    ft.app(target=main, port=port, view=ft.AppView.WEB_BROWSER)
