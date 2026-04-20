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
from src.screens.profile_page import ProfilePage
from src.screens.session_page import SessionPage
from src.screens.history_page import HistoryPage
from src.screens.session_detail_page import SessionDetailPage
from src.screens.settings_page import SettingsPage
from src.screens.lock_screen import PasswordLockScreen


class OpenMarcusApp:
    """Main application class managing routes and navigation."""

    def __init__(self, page: ft.Page):
        self.page = page
        self.current_session_id = None  # For session detail navigation
        self.lock_screen = PasswordLockScreen(self)
        self.login_screen = LoginScreen(self)
        self.register_screen = RegisterScreen(self)
        self.onboarding_screen = OnboardingScreen(self)
        self.home_page = HomePage(self)
        self.profile_page = ProfilePage(self)
        self.session_page = SessionPage(self)
        self.history_page = HistoryPage(self)
        self.session_detail_page = SessionDetailPage(self)
        self.settings_page = SettingsPage(self)
        self.setup_theme()
        self.setup_routes()
        # Set initial route synchronously to ensure view is shown immediately
        self._show_initial_view()

    def _show_initial_view(self) -> None:
        """Show the appropriate initial view synchronously without page.go()."""
        from src.services.password_lock import password_lock_service

        if password_lock_service.is_password_set() and not password_lock_service.is_unlocked():
            initial_route = "/lock"
        elif password_lock_service.is_first_launch():
            initial_route = "/lock"
        else:
            initial_route = "/login"

        # Set route and show view synchronously
        self.page.route = initial_route
        self._build_current_view()
        self.page.update()

    def _build_current_view(self) -> None:
        """Build the view for the current route."""
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
        elif self.page.route == "/profile":
            self.page.views.append(self.profile_page.build())
        elif self.page.route == "/session":
            self.page.views.append(self.session_page.build())
        elif self.page.route == "/history":
            self.page.views.append(self.history_page.build())
        elif self.page.route == "/settings":
            self.page.views.append(self.settings_page.build())
        elif self.page.route.startswith("/session/") and self.page.route != "/session":
            route_part = self.page.route.split("/session/")[1]
            if route_part and route_part != "detail":
                self.current_session_id = route_part
                self.page.views.append(self.session_detail_page.build())
            elif route_part == "detail":
                self.page.views.append(self.history_page.build())
        else:
            self.page.views.append(self.lock_screen.build())

    def check_password_lock(self) -> None:
        """Check if password lock is enabled and redirect accordingly."""
        from src.services.password_lock import password_lock_service

        if password_lock_service.is_password_set() and not password_lock_service.is_unlocked():
            self.page.go("/lock")
        elif password_lock_service.is_first_launch():
            self.page.go("/lock")
        else:
            self.page.go("/login")

    def setup_theme(self) -> None:
        """Configure app theme with consistent styling."""
        self.page.theme = ft.Theme(
            color_scheme_seed=ft.Colors.DEEP_PURPLE,
            font_family="Helvetica",
        )
        self.page.theme_mode = ft.ThemeMode.LIGHT
        self.page.title = "OpenMarcus"
        self.page.window_width = 1200
        self.page.window_height = 800
        self.page.window_min_width = 800
        self.page.window_min_height = 600

    def setup_routes(self) -> None:
        """Register all application routes with named views."""
        self.page.on_route_change = self.route_change

    def route_change(self, route: ft.RouteChangeEvent) -> None:
        """Handle route changes and display appropriate view."""
        self.page.views.clear()

        # Handle session detail route with ID pattern /session/{id}
        if self.page.route.startswith("/session/") and self.page.route != "/session":
            # Extract session ID from route
            route_part = self.page.route.split("/session/")[1]
            # Exclude special routes like "detail" used as fallback when no session ID
            if route_part and route_part != "detail":
                self.current_session_id = route_part
                self.page.views.append(self.session_detail_page.build())
                return
            elif route_part == "detail":
                # This is the fallback route from session_detail_page when no session ID
                # Redirect to history page as there's no valid session to display
                self.page.views.append(self.history_page.build())
                return

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
        elif self.page.route == "/profile":
            self.page.views.append(self.profile_page.build())
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
