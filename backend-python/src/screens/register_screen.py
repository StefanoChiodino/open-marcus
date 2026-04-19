"""
Registration Screen for OpenMarcus.
New user account creation.
"""

import flet as ft


class RegisterScreen:
    """Registration screen with username, password, and confirm password."""

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
        self.confirm_password_field = ft.TextField(
            label="Confirm Password",
            password=True,
            width=300,
        )
        self.error_text = ft.Text(
            color=ft.colors.ERROR,
            visible=False,
        )

    def build(self) -> ft.View:
        """Build the registration view."""
        return ft.View(
            route="/register",
            controls=[
                ft.Container(
                    alignment=ft.alignment.center,
                    expand=True,
                    content=ft.Column(
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        controls=[
                            ft.Text(
                                "Create Account",
                                size=40,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Text(
                                "Start your Stoic meditation journey",
                                size=16,
                                color=ft.colors.GREY_600,
                            ),
                            ft.Container(height=32),
                            self.error_text,
                            ft.Container(height=8),
                            ft.Container(
                                content=ft.Column(
                                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                    controls=[
                                        self.username_field,
                                        ft.Container(height=16),
                                        self.password_field,
                                        ft.Container(height=16),
                                        self.confirm_password_field,
                                        ft.Container(height=24),
                                        ft.ElevatedButton(
                                            "Create Account",
                                            width=300,
                                            on_click=self.handle_register,
                                        ),
                                        ft.Container(height=12),
                                        ft.TextButton(
                                            "Already have an account? Login",
                                            on_click=self.go_to_login,
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

    def handle_register(self, e):
        """Handle registration button click."""
        username = self.username_field.value
        password = self.password_field.value
        confirm = self.confirm_password_field.value

        if not username or not password:
            self.error_text.value = "Please fill in all fields"
            self.error_text.visible = True
            self.app.page.update()
            return

        if password != confirm:
            self.error_text.value = "Passwords do not match"
            self.error_text.visible = True
            self.app.page.update()
            return

        # Placeholder for actual registration
        self.error_text.value = ""
        self.error_text.visible = False
        self.app.navigate_to("/onboarding")

    def go_to_login(self, e):
        """Navigate to login screen."""
        self.app.navigate_to("/login")
