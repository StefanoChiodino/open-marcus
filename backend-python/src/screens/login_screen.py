"""
Login Screen for OpenMarcus.
User authentication with username and password.
"""

import flet as ft

from ..services.api_client import api_client


class LoginScreen:
    """Login screen with username/password form."""

    def __init__(self, app):
        self.app = app
        self.username_field = ft.TextField(
            label="Username",
            width=300,
            autofocus=True,
            on_submit=self.handle_login,
        )
        self.password_field = ft.TextField(
            label="Password",
            password=True,
            width=300,
            on_submit=self.handle_login,
        )
        self.error_text = ft.Text(
            color=ft.colors.ERROR,
            visible=False,
        )
        self.loading = False
        self.loading_indicator = ft.ProgressRing(visible=False)

    def build(self) -> ft.View:
        """Build the login view."""
        return ft.View(
            route="/login",
            controls=[
                ft.Container(
                    alignment=ft.alignment.center,
                    expand=True,
                    content=ft.Column(
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        controls=[
                            ft.Icon(
                                name=ft.icons.MOOD,
                                size=64,
                                color=ft.colors.DEEP_PURPLE,
                            ),
                            ft.Container(height=24),
                            ft.Text(
                                "OpenMarcus",
                                size=48,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Text(
                                "Your Stoic Meditation Companion",
                                size=16,
                                color=ft.colors.GREY_600,
                            ),
                            ft.Container(height=40),
                            self.error_text,
                            ft.Container(height=8),
                            ft.Container(
                                content=ft.Column(
                                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                    controls=[
                                        self.username_field,
                                        ft.Container(height=16),
                                        self.password_field,
                                        ft.Container(height=24),
                                        ft.ElevatedButton(
                                            "Login",
                                            width=300,
                                            on_click=self.handle_login,
                                            disabled=self.loading,
                                        ),
                                        ft.Container(height=12),
                                        ft.TextButton(
                                            "Don't have an account? Register",
                                            on_click=self.go_to_register,
                                        ),
                                    ],
                                    alignment=ft.MainAxisAlignment.CENTER,
                                ),
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
        self.username_field.disabled = is_loading
        self.password_field.disabled = is_loading
        self.app.page.update()

    def show_error(self, message: str) -> None:
        """Show error message."""
        self.error_text.value = message
        self.error_text.visible = True
        self.app.page.update()

    def clear_error(self) -> None:
        """Clear error message."""
        self.error_text.value = ""
        self.error_text.visible = False

    async def handle_login(self, e=None) -> None:
        """Handle login button click."""
        username = self.username_field.value
        password = self.password_field.value

        if not username or not password:
            self.show_error("Please enter username and password")
            return

        self.clear_error()
        self.set_loading(True)

        try:
            result, error = await api_client.login(username, password)

            if error:
                self.show_error(error)
                self.set_loading(False)
                return

            # Store token
            if result and "access_token" in result:
                api_client.token = result["access_token"]
                self.set_loading(False)
                self.app.navigate_to("/home")
            else:
                self.show_error("Invalid response from server")
                self.set_loading(False)

        except Exception as e:
            self.show_error(f"Login failed: {str(e)}")
            self.set_loading(False)

    def go_to_register(self, e=None) -> None:
        """Navigate to registration screen."""
        self.app.navigate_to("/register")
