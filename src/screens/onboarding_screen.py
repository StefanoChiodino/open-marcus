"""
Onboarding Screen for OpenMarcus.
Profile creation for new users.
"""

import flet as ft

from src.services.api_client import api_client
from src.screens.error_components import ErrorBanner


class OnboardingScreen:
    """Onboarding screen for profile creation."""

    def __init__(self, app):
        self.app = app
        self.name_field = ft.TextField(
            label="Your Name",
            width=400,
            autofocus=True,
        )
        self.goals_field = ft.TextField(
            label="Meditation Goals (What do you hope to achieve?)",
            width=400,
            multiline=True,
            min_lines=3,
        )
        self.experience_dropdown = ft.Dropdown(
            label="Experience Level",
            width=400,
            options=[
                ft.dropdown.Option("beginner", "Beginner"),
                ft.dropdown.Option("intermediate", "Intermediate"),
                ft.dropdown.Option("advanced", "Advanced"),
            ],
            value="beginner",
        )
        self.error_text = ft.Text(
            color=ft.Colors.ERROR,
            visible=False,
        )
        
        # Error banner for network/validation errors with retry capability
        self.error_banner = ErrorBanner(
            on_retry=self._handle_error_retry,
            on_dismiss=self._handle_error_dismiss,
        )
        self.error_banner.container.visible = False
        
        self.loading = False
        self.loading_indicator = ft.ProgressRing(visible=False)

    def build(self) -> ft.View:
        """Build the onboarding view."""
        return ft.View(
            route="/onboarding",
            controls=[
                ft.Container(
                    alignment=ft.alignment.center,
                    expand=True,
                    content=ft.Column(
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        controls=[
                            ft.Text(
                                "Welcome to OpenMarcus",
                                size=36,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Text(
                                "Let's set up your meditation profile",
                                size=16,
                                color=ft.Colors.GREY_600,
                            ),
                            ft.Container(height=40),
                            # Error banner for network/validation errors
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=20),
                                content=self.error_banner.container,
                                visible=False,
                            ),
                            self.error_text,
                            ft.Container(height=8),
                            self.name_field,
                            ft.Container(height=16),
                            self.goals_field,
                            ft.Container(height=16),
                            self.experience_dropdown,
                            ft.Container(height=32),
                            ft.ElevatedButton(
                                "Continue",
                                width=300,
                                height=50,
                                on_click=self.handle_continue,
                                disabled=self.loading,
                            ),
                            ft.Container(height=16),
                            self.loading_indicator,
                        ],
                    ),
                ),
            ],
        )

    def set_loading(self, is_loading: bool) -> None:
        """Set loading state for the form."""
        self.loading = is_loading
        self.loading_indicator.visible = is_loading
        self.name_field.disabled = is_loading
        self.goals_field.disabled = is_loading
        self.experience_dropdown.disabled = is_loading
        self.app.page.update()

    def show_error(self, message: str) -> None:
        """Show error message."""
        self.error_text.value = message
        self.error_text.visible = True
        
        # Also show error banner for retry capability
        self.error_banner.show(message, is_retryable=True)
        self.error_banner.container.visible = True
        
        self.app.page.update()

    def clear_error(self) -> None:
        """Clear error message."""
        self.error_text.value = ""
        self.error_text.visible = False
        self.error_banner.hide()

    def _handle_error_retry(self, e: ft.ControlEvent) -> None:
        """Handle retry button click on error banner."""
        self.error_banner.hide()
        self.clear_error()
        import asyncio
        asyncio.create_task(self.handle_continue())

    def _handle_error_dismiss(self, e: ft.ControlEvent) -> None:
        """Handle dismiss button click on error banner."""
        self.error_banner.hide()
        self.clear_error()

    async def handle_continue(self, e=None) -> None:
        """Handle continue button click."""
        name = self.name_field.value
        goals = self.goals_field.value or ""
        experience = self.experience_dropdown.value

        if not name:
            self.show_error("Please enter your name")
            return

        self.clear_error()
        self.set_loading(True)

        try:
            result, error = await api_client.create_profile(name, goals, experience)

            if error:
                self.show_error(error)
                self.set_loading(False)
                return

            # Profile created successfully - navigate to home
            self.set_loading(False)
            self.app.navigate_to("/home")

        except Exception as e:
            self.show_error(f"Failed to create profile: {str(e)}")
            self.set_loading(False)
