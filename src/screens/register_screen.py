"""
Registration Screen for OpenMarcus.
New user account creation.
"""

import flet as ft

from src.services.api_client import api_client
from src.screens.error_components import ErrorBanner, NetworkErrorBanner


class RegisterScreen:
    """Registration screen with username, password, and confirm password."""

    def __init__(self, app):
        self.app = app
        self.username_field = ft.TextField(
            label="Username",
            width=300,
            autofocus=True,
            on_submit=self.handle_register,
        )
        self.password_field = ft.TextField(
            label="Password",
            password=True,
            width=300,
            on_submit=self.handle_register,
        )
        self.confirm_password_field = ft.TextField(
            label="Confirm Password",
            password=True,
            width=300,
            on_submit=self.handle_register,
        )
        self.error_text = ft.Text(
            color=ft.Colors.ERROR,
            visible=False,
        )
        self.success_text = ft.Text(
            color=ft.Colors.GREEN,
            visible=False,
        )
        
        # Error banner for network/validation errors with retry capability
        self.error_banner = ErrorBanner(
            on_retry=self._handle_error_retry,
            on_dismiss=self._handle_error_dismiss,
        )
        self.error_banner.container.visible = False
        
        # Network error banner with specialized messaging
        self.network_error_banner = NetworkErrorBanner(
            on_retry=self._handle_error_retry,
            on_dismiss=self._handle_error_dismiss,
        )
        self.network_error_banner.container.visible = False
        
        self.loading = False
        self.loading_indicator = ft.ProgressRing(visible=False)

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
                                color=ft.Colors.GREY_600,
                            ),
                            ft.Container(height=32),
                            # Error banners for network/validation errors
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=20),
                                content=self.error_banner.container,
                                visible=False,
                            ),
                            ft.Container(
                                padding=ft.padding.symmetric(horizontal=20),
                                content=self.network_error_banner.container,
                                visible=False,
                            ),
                            self.error_text,
                            self.success_text,
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
                                            disabled=self.loading,
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
        self.confirm_password_field.disabled = is_loading
        self.app.page.update()

    def show_error(self, message: str, is_network_error: bool = False) -> None:
        """Show error message."""
        self.error_text.value = message
        self.error_text.visible = True
        self.success_text.visible = False
        
        # Also show appropriate error banner for prominent display
        if is_network_error or self._is_network_error_message(message):
            self.network_error_banner.show_network_error(
                error_type=self._classify_network_error(message),
                custom_message=message
            )
            self.network_error_banner.container.visible = True
        else:
            self.error_banner.show(message, is_retryable=True)
            self.error_banner.container.visible = True
        
        self.app.page.update()

    def _is_network_error_message(self, message: str) -> bool:
        """Check if the error message is a network-related error."""
        network_keywords = [
            "connect", "timeout", "network", "offline", "internet",
            "server", "connection", "request timed out", "cannot connect"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in network_keywords)

    def _classify_network_error(self, message: str) -> str:
        """Classify the type of network error."""
        message_lower = message.lower()
        if "timeout" in message_lower:
            return "timeout"
        elif "connect" in message_lower or "connection" in message_lower:
            return "connection"
        elif "offline" in message_lower or "internet" in message_lower:
            return "offline"
        elif "server" in message_lower:
            return "server"
        else:
            return "unknown"

    def _handle_error_retry(self, e: ft.ControlEvent) -> None:
        """Handle retry button click on error banner."""
        self.error_banner.hide()
        self.network_error_banner.hide()
        self.clear_messages()
        import asyncio
        asyncio.create_task(self.handle_register())

    def _handle_error_dismiss(self, e: ft.ControlEvent) -> None:
        """Handle dismiss button click on error banner."""
        self.error_banner.hide()
        self.network_error_banner.hide()
        self.clear_messages()

    def show_success(self, message: str) -> None:
        """Show success message."""
        self.success_text.value = message
        self.success_text.visible = True
        self.error_text.visible = False
        self.error_banner.hide()
        self.network_error_banner.hide()
        self.app.page.update()

    def clear_messages(self) -> None:
        """Clear all messages."""
        self.error_text.value = ""
        self.error_text.visible = False
        self.success_text.value = ""
        self.success_text.visible = False
        self.error_banner.hide()
        self.network_error_banner.hide()

    def validate_form(self, username: str, password: str, confirm: str) -> tuple[bool, str]:
        """
        Validate registration form fields.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not username or not password or not confirm:
            return False, "Please fill in all fields"

        if len(username) < 3:
            return False, "Username must be at least 3 characters"

        if len(username) > 50:
            return False, "Username must be 50 characters or less"

        if len(password) < 8:
            return False, "Password must be at least 8 characters"

        if password != confirm:
            return False, "Passwords do not match"

        return True, ""

    async def handle_register(self, e=None) -> None:
        """Handle registration button click."""
        username = self.username_field.value
        password = self.password_field.value
        confirm = self.confirm_password_field.value

        # Validate form
        is_valid, error_msg = self.validate_form(username, password, confirm)
        if not is_valid:
            self.show_error(error_msg)
            return

        self.clear_messages()
        self.set_loading(True)

        try:
            result, error = await api_client.register(username, password)

            if error:
                self.show_error(error)
                self.set_loading(False)
                return

            # Registration successful - show success and navigate
            if result:
                self.show_success("Account created! Redirecting to login...")
                self.set_loading(False)
                # Clear form
                self.username_field.value = ""
                self.password_field.value = ""
                self.confirm_password_field.value = ""
                # Navigate to login after brief delay
                import asyncio
                asyncio.create_task(self._delayed_navigate())

        except Exception as e:
            error_str = str(e).lower()
            is_network = any(kw in error_str for kw in ["connect", "timeout", "network", "http"])
            self.show_error(f"Registration failed: {str(e)}", is_network_error=is_network)
            self.set_loading(False)

    async def _delayed_navigate(self) -> None:
        """Navigate to login after brief delay."""
        import asyncio
        await asyncio.sleep(1.5)
        self.app.navigate_to("/login")

    def go_to_login(self, e=None) -> None:
        """Navigate to login screen."""
        self.app.navigate_to("/login")
