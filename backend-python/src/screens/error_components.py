"""
Error Banner Component for OpenMarcus.
A reusable error display with dismiss and retry functionality.
"""

from typing import Optional

import flet as ft


class ErrorBanner:
    """
    A reusable error banner component that displays friendly error messages
    with options to dismiss and retry the failed operation.
    """

    def __init__(
        self,
        on_retry=None,
        on_dismiss=None,
        message: str = "",
        is_retryable: bool = True,
    ):
        """
        Initialize the error banner.

        Args:
            on_retry: Callback when retry button is clicked
            on_dismiss: Callback when dismiss button is clicked
            message: The error message to display
            is_retryable: Whether to show the retry button
        """
        self.on_retry = on_retry
        self.on_dismiss = on_dismiss
        self.message = message
        self.is_retryable = is_retryable

        # Create the close button
        self.dismiss_button = ft.IconButton(
            icon=ft.Icons.CLOSE,
            icon_size=18,
            icon_color=ft.Colors.GREY_600,
            tooltip="Dismiss",
            on_click=self._handle_dismiss,
        )

        # Create the retry button
        self.retry_button = ft.TextButton(
            text="Retry",
            icon=ft.Icons.REFRESH,
            on_click=self._handle_retry,
        )

        # Create the error icon
        self.error_icon = ft.Icon(
            name=ft.Icons.ERROR_OUTLINE,
            size=20,
            color=ft.Colors.ERROR,
        )

        # Create the error text
        self.error_text = ft.Text(
            value=message,
            size=14,
            color=ft.Colors.ERROR,
            expand=True,
        )

        # Build the banner container
        self.container = ft.Container(
            padding=ft.padding.symmetric(horizontal=12, vertical=8),
            border_radius=8,
            bgcolor=ft.Colors.ERROR_CONTAINER,
            content=ft.Row(
                controls=[
                    self.error_icon,
                    ft.Container(width=8),
                    self.error_text,
                    ft.Container(width=8),
                    self.retry_button if is_retryable else ft.Container(),
                    self.dismiss_button,
                ],
                alignment=ft.MainAxisAlignment.START,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    def _handle_retry(self, e: ft.ControlEvent) -> None:
        """Handle retry button click."""
        if self.on_retry:
            self.on_retry(e)

    def _handle_dismiss(self, e: ft.ControlEvent) -> None:
        """Handle dismiss button click."""
        self.container.visible = False
        if self.on_dismiss:
            self.on_dismiss(e)

    def show(self, message: str, is_retryable: bool = True) -> None:
        """Show the banner with a message."""
        self.message = message
        self.error_text.value = message
        self.retry_button.visible = is_retryable
        self.is_retryable = is_retryable
        self.container.visible = True

    def hide(self) -> None:
        """Hide the banner."""
        self.container.visible = False

    def update_message(self, message: str) -> None:
        """Update the error message."""
        self.message = message
        self.error_text.value = message

    def set_retry_callback(self, callback) -> None:
        """Set the retry callback."""
        self.on_retry = callback

    def set_dismiss_callback(self, callback) -> None:
        """Set the dismiss callback."""
        self.on_dismiss = callback


class NetworkErrorBanner(ErrorBanner):
    """
    Specialized error banner for network errors with helpful messaging.
    """

    # Friendly error messages for different error types
    NETWORK_ERROR_MESSAGES = {
        "timeout": "The request took too long. Please check your connection and try again.",
        "connection": "Cannot connect to the server. Please ensure the backend is running.",
        "offline": "You appear to be offline. Please check your internet connection.",
        "server": "The server encountered an error. Please try again in a few moments.",
        "unknown": "Something went wrong. Please try again.",
    }

    def __init__(
        self,
        on_retry=None,
        on_dismiss=None,
        on_go_offline=None,
    ):
        """
        Initialize network error banner.

        Args:
            on_retry: Callback when retry button is clicked
            on_dismiss: Callback when dismiss button is clicked
            on_go_offline: Callback for offline mode (if available)
        """
        self.on_go_offline = on_go_offline
        super().__init__(
            on_retry=on_retry,
            on_dismiss=on_dismiss,
            message=self.NETWORK_ERROR_MESSAGES["unknown"],
            is_retryable=True,
        )

    def show_network_error(self, error_type: str = "unknown", custom_message: Optional[str] = None) -> None:
        """Show a network error with appropriate message."""
        if custom_message:
            message = custom_message
        else:
            message = self.NETWORK_ERROR_MESSAGES.get(
                error_type, self.NETWORK_ERROR_MESSAGES["unknown"]
            )
        self.show(message, is_retryable=True)


class ErrorDialog:
    """
    A dialog for critical errors that require user acknowledgment.
    """

    def __init__(self, app, title: str = "Error", content: str = ""):
        """
        Initialize error dialog.

        Args:
            app: The main app instance
            title: Dialog title
            content: Error message content
        """
        self.app = app
        self.title = title
        self.content = content

        self.dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text(title),
            content=ft.Text(content),
            actions=[
                ft.TextButton("OK", on_click=self._close),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

    def _close(self, e: ft.ControlEvent) -> None:
        """Close the dialog."""
        self.dialog.open = False
        self.app.page.update()

    def show(self, title: Optional[str] = None, content: Optional[str] = None) -> None:
        """Show the error dialog."""
        if title:
            self.dialog.title = ft.Text(title)
        if content:
            self.dialog.content = ft.Text(content)

        self.app.page.dialog = self.dialog
        self.dialog.open = True
        self.app.page.update()


class ConfirmDialog:
    """
    A confirmation dialog for destructive actions.
    """

    def __init__(
        self,
        app,
        title: str,
        content: str,
        confirm_text: str = "Confirm",
        cancel_text: str = "Cancel",
        is_destructive: bool = False,
        on_confirm=None,
        on_cancel=None,
    ):
        """
        Initialize confirmation dialog.

        Args:
            app: The main app instance
            title: Dialog title
            content: Dialog content text
            confirm_text: Text for confirm button
            cancel_text: Text for cancel button
            is_destructive: Whether this is a destructive action
            on_confirm: Callback when confirmed
            on_cancel: Callback when cancelled
        """
        self.app = app
        self.on_confirm = on_confirm
        self.on_cancel = on_cancel

        confirm_color = ft.Colors.ERROR if is_destructive else ft.Colors.PRIMARY

        self.dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text(title),
            content=ft.Text(content),
            actions=[
                ft.TextButton(cancel_text, on_click=self._handle_cancel),
                ft.TextButton(
                    confirm_text,
                    on_click=self._handle_confirm,
                    style=ft.ButtonStyle(color=confirm_color),
                ),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

    def _handle_confirm(self, e: ft.ControlEvent) -> None:
        """Handle confirm button click."""
        self.dialog.open = False
        self.app.page.update()
        if self.on_confirm:
            self.on_confirm(e)

    def _handle_cancel(self, e: ft.ControlEvent) -> None:
        """Handle cancel button click."""
        self.dialog.open = False
        self.app.page.update()
        if self.on_cancel:
            self.on_cancel(e)

    def show(self) -> None:
        """Show the confirmation dialog."""
        self.app.page.dialog = self.dialog
        self.dialog.open = True
        self.app.page.update()
