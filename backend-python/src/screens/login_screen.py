"""
Login Screen for OpenMarcus.
User authentication with username and password.
"""

import flet as ft


class LoginScreen:
    """Login screen with username/password form."""

    def __init__(self, app):
        self.app = app
        self.username_field = ft.TextField(
            label="Username",
            width=300,
            autofocus=True,
        )
        self.password_field = ft.TextField(
            label="Password",
            password=True,
            width=300,
        )
        self.error_text = ft.Text(
            color=ft.colors.ERROR,
            visible=False,
        )

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
                        ],
                    ),
                ),
            ],
        )

    def handle_login(self, e):
        """Handle login button click."""
        username = self.username_field.value
        password = self.password_field.value

        if not username or not password:
            self.error_text.value = "Please enter username and password"
            self.error_text.visible = True
            self.app.page.update()
            return

        # Placeholder for actual authentication
        self.error_text.value = ""
        self.error_text.visible = False
        self.app.navigate_to("/home")

    def go_to_register(self, e):
        """Navigate to registration screen."""
        self.app.navigate_to("/register")
