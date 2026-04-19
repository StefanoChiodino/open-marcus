"""
Session Page for OpenMarcus.
Meditation chat interface with Marcus Aurelius.
"""

import flet as ft


class SessionPage:
    """Session page with chat interface."""

    def __init__(self, app):
        self.app = app
        self.messages = []
        self.message_input = ft.TextField(
            hint_text="Share your thoughts...",
            expand=True,
            multiline=True,
            min_lines=1,
            max_lines=5,
            on_submit=self.send_message,
        )
        self.is_loading = False

    def build(self) -> ft.View:
        """Build the session view."""
        return ft.View(
            route="/session",
            controls=[
                ft.AppBar(
                    title=ft.Text("Meditation Session"),
                    center_title=True,
                    leading=ft.IconButton(
                        icon=ft.Icons.ARROW_BACK,
                        on_click=lambda _: self.app.navigate_to("/home"),
                    ),
                    actions=[
                        ft.IconButton(
                            icon=ft.Icons.INFO_OUTLINE,
                            on_click=self.show_session_info,
                        ),
                    ],
                ),
                ft.Container(
                    expand=True,
                    padding=ft.padding.all(20),
                    content=ft.Column(
                        controls=[
                            # Marcus intro card
                            ft.Container(
                                content=ft.Column(
                                    controls=[
                                        ft.Row(
                                            controls=[
                                                ft.CircleAvatar(
                                                    content=ft.Text(
                                                        "M",
                                                        size=20,
                                                        color=ft.Colors.WHITE,
                                                    ),
                                                    bgcolor=ft.Colors.DEEP_PURPLE,
                                                    radius=20,
                                                ),
                                                ft.Container(width=12),
                                                ft.Column(
                                                    controls=[
                                                        ft.Text(
                                                            "Marcus Aurelius",
                                                            size=16,
                                                            weight=ft.FontWeight.BOLD,
                                                        ),
                                                        ft.Text(
                                                            "Roman Emperor & Stoic Philosopher",
                                                            size=12,
                                                            color=ft.Colors.GREY_600,
                                                        ),
                                                    ],
                                                ),
                                            ],
                                        ),
                                        ft.Container(height=12),
                                        ft.Text(
                                            "I am here to guide your meditation. Share what is on your mind, and we shall explore it together through the lens of Stoic wisdom.",
                                            size=14,
                                            color=ft.Colors.GREY_700,
                                            italic=True,
                                        ),
                                    ],
                                ),
                                padding=20,
                                border_radius=12,
                                bgcolor=ft.Colors.SURFACE_VARIANT,
                            ),
                            ft.Container(height=16),
                            # Messages list
                            ft.ListView(
                                expand=True,
                                controls=self.build_message_controls(),
                            ),
                            ft.Container(height=16),
                            # Input area
                            ft.Container(
                                content=ft.Row(
                                    controls=[
                                        self.message_input,
                                        ft.Container(width=12),
                                        ft.IconButton(
                                            icon=ft.Icons.SEND,
                                            icon_size=28,
                                            bgcolor=ft.Colors.DEEP_PURPLE,
                                            color=ft.Colors.WHITE,
                                            on_click=self.send_message,
                                        ),
                                    ],
                                    alignment=ft.MainAxisAlignment.CENTER,
                                ),
                                padding=ft.padding.only(top=8),
                            ),
                        ],
                    ),
                ),
            ],
        )

    def build_message_controls(self) -> list:
        """Build message list controls."""
        if not self.messages:
            return [
                ft.Container(
                    content=ft.Text(
                        "Your conversation will appear here...",
                        size=14,
                        color=ft.Colors.GREY_500,
                        italic=True,
                    ),
                    alignment=ft.alignment.center,
                    padding=40,
                ),
            ]

        controls = []
        for msg in self.messages:
            is_user = msg.get("is_user", True)
            controls.append(
                ft.Container(
                    content=ft.Column(
                        controls=[
                            ft.Text(
                                msg.get("text", ""),
                                size=14,
                            ),
                        ],
                    ),
                    alignment=ft.alignment.center if is_user else ft.alignment.center_left,
                    padding=12,
                    margin=ft.margin.only(
                        left=60 if is_user else 0,
                        right=0 if is_user else 60,
                    ),
                    border_radius=12,
                    bgcolor=ft.Colors.PRIMARY_CONTAINER if not is_user else ft.Colors.SECONDARY_CONTAINER,
                ),
            )
        return controls

    def send_message(self, e=None):
        """Handle message send."""
        text = self.message_input.value
        if not text:
            return

        self.messages.append({
            "text": text,
            "is_user": True,
        })
        self.message_input.value = ""
        self.app.page.update()

    def show_session_info(self, e):
        """Show session info dialog."""
        pass  # Placeholder for session info dialog
