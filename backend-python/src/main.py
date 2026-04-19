"""
OpenMarcus - Flet Application Entry Point

A mental well-being companion with Marcus Aurelius persona.
Local-first, privacy-focused meditation app.
"""

import flet as ft

from src.screens.login_screen import LoginScreen
from src.screens.register_screen import RegisterScreen
from src.screens.onboarding_screen import OnboardingScreen
from src.screens.home_page import HomePage
from src.screens.session_page import SessionPage
from src.screens.history_page import HistoryPage
from src.screens.settings_page import SettingsPage
from src.screens.lock_screen import PasswordLockScreen


class OpenMarcusApp:
    """Main application class managing routes and navigation."""

    def __init__(self, page: ft.Page):
        self.page = page
        self.lock_screen = PasswordLockScreen(self)
        self.login_screen = LoginScreen(self)
        self.register_screen = RegisterScreen(self)
        self.onboarding_screen = OnboardingScreen(self)
        self.home_page = HomePage(self)
        self.session_page = SessionPage(self)
        self.history_page = HistoryPage(self)
        self.settings_page = SettingsPage(self)
        self.setup_theme()
        self.setup_routes()
        self.check_password_lock()

    def setup_theme(self) -> None:
        """Configure app theme with consistent styling."""
        self.page.theme = ft.Theme(
            color_scheme_seed=ft.colors.DEEP_PURPLE,
            font_family="Helvetica",
        )
        self.page.theme_mode = ft.ThemeMode.LIGHT
        self.page.title = "OpenMarcus"
        self.page.window_width = 1200
        self.page.window_height = 800
        self.page.window_min_width = 800
        self.page.window_min_height = 600

    def check_password_lock(self) -> None:
        """Check if password lock is enabled and redirect accordingly."""
        from src.services.password_lock import password_lock_service
        
        # If password is set but app is locked, show lock screen
        if password_lock_service.is_password_set() and not password_lock_service.is_unlocked():
            self.page.go("/lock")
        # If password is not set, show setup screen
        elif password_lock_service.is_first_launch():
            # First launch - go to lock screen which will show setup mode
            self.page.go("/lock")
        else:
            # Already unlocked - go to login
            self.page.go("/login")

    def setup_routes(self) -> None:
        """Register all application routes with named views."""
        self.page.on_route_change = self.route_change
        # Don't auto-navigate here - check_password_lock handles initial route

    def route_change(self, route: ft.RouteChangeEvent) -> None:
        """Handle route changes and display appropriate view."""
        self.page.views.clear()

        if self.page.route == "/lock":
            self.page.views.append(self.lock_screen.build())
        elif self.page.route == "/login":
            self.page.views.append(self.login_screen.build())
        elif self.page.route == "/register":
            self.page.views.append(self.register_screen.build())
        elif self.page.route == "/onboarding":
            self.page.views.append(self.onboarding_screen.build())
        elif self.page.route == "/home":
            self.page.views.append(self.home_page.build())
        elif self.page.route == "/session":
            self.page.views.append(self.session_page.build())
        elif self.page.route == "/history":
            self.page.views.append(self.history_page.build())
        elif self.page.route == "/settings":
            self.page.views.append(self.settings_page.build())
        else:
            # Default route - check password lock first
            self.check_password_lock()

    def navigate_to(self, route: str) -> None:
        """Navigate to a specific route."""
        self.page.go(route)


def main(page: ft.Page) -> None:
    """Application entry point."""
    OpenMarcusApp(page)


ft.app(target=main)
