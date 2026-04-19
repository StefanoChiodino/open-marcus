"""
Session Detail Page for OpenMarcus.
Display full conversation and summary for a completed session.
"""

import flet as ft
import asyncio
from datetime import datetime
from typing import Optional

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


class SessionDetailPage:
    """Session detail page showing full conversation and summary."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        self.session_data: Optional[dict] = None
        self.loading = True
        self.loading_indicator = ft.ProgressRing(visible=True)
        self.error_text = ft.Text(
            "",
            color=ft.Colors.ERROR,
            size=14,
            visible=False,
        )
        self.content_container: Optional[ft.Container] = None

    def build(self) -> ft.View:
        """Build the session detail view."""
        # Get session ID from app state
        session_id = getattr(self.app, 'current_session_id', None)

        if not session_id:
            # No session ID - show error and redirect
            self.error_text.value = "No session ID provided"
            self.error_text.visible = True

        # Create content container for dynamic content
        self.content_container = ft.Container(
            expand=True,
            content=ft.Column(
                controls=[
                    self.loading_indicator,
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                expand=True,
            ),
        )

        view = ft.View(
            route=f"/session/{session_id}" if session_id else "/session/detail",
            controls=[
                ft.Row(
                    controls=[
                        self.navigation.build("/history"),
                        ft.VerticalDivider(width=1),
                        ft.Container(
                            expand=True,
                            content=ft.Column(
                                controls=[
                                    ft.Container(
                                        padding=ft.padding.all(16),
                                        content=ft.Row(
                                            controls=[
                                                ft.IconButton(
                                                    icon=ft.Icons.ARROW_BACK,
                                                    on_click=lambda _: self.app.navigate_to("/history"),
                                                ),
                                                ft.Text(
                                                    "Session Details",
                                                    size=18,
                                                    weight=ft.FontWeight.BOLD,
                                                ),
                                            ],
                                        ),
                                    ),
                                    self.error_text,
                                    ft.Container(
                                        expand=True,
                                        content=self.content_container,
                                    ),
                                ],
                            ),
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
            ],
        )

        # Start loading session data
        if session_id:
            asyncio.create_task(self.load_session(session_id))

        return view

    async def load_session(self, session_id: str) -> None:
        """Load session data from API."""
        self.loading = True
        self.loading_indicator.visible = True
        self.error_text.visible = False
        self.app.page.update()

        try:
            result, error = await api_client.get_session(session_id)

            if error:
                self.error_text.value = f"Failed to load session: {error}"
                self.error_text.visible = True
                self.session_data = None
            elif result:
                self.session_data = result
            else:
                self.session_data = None

        except Exception as e:
            self.error_text.value = f"Error loading session: {str(e)}"
            self.error_text.visible = True
            self.session_data = None

        self.loading = False
        self.loading_indicator.visible = False
        self.update_content()

    def update_content(self) -> None:
        """Update the content with loaded session data."""
        if self.loading or not self.content_container:
            return

        if self.error_text.visible:
            # Show error state - navigate back after delay
            self.content_container.content = ft.Column(
                controls=[
                    ft.Container(
                        content=ft.Column(
                            controls=[
                                ft.Icon(
                                    ft.Icons.ERROR_OUTLINE,
                                    size=48,
                                    color=ft.Colors.ERROR,
                                ),
                                ft.Container(height=16),
                                ft.Text(
                                    self.error_text.value,
                                    size=16,
                                    color=ft.Colors.ERROR,
                                ),
                                ft.Container(height=16),
                                ft.ElevatedButton(
                                    "Go Back",
                                    on_click=lambda _: self.app.navigate_to("/history"),
                                ),
                            ],
                        ),
                        alignment=ft.alignment.center,
                    ),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                expand=True,
            )
            self.app.page.update()
            return

        if not self.session_data:
            # No session data
            self.content_container.content = ft.Column(
                controls=[
                    ft.Text(
                        "Session not found",
                        size=16,
                        color=ft.Colors.GREY_500,
                    ),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                expand=True,
            )
            self.app.page.update()
            return

        # Build the session detail content
        self.content_container.content = self._build_session_detail_content()
        self.app.page.update()

    def _build_session_detail_content(self) -> ft.Column:
        """Build the session detail content."""
        session = self.session_data

        if session is None:
            return ft.Column(
                controls=[
                    ft.Container(height=20),
                    ft.Text(
                        "No session data available",
                        size=14,
                        color=ft.Colors.GREY_600,
                    ),
                ],
            )

        # Format date
        created_at = session.get("created_at", "")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                date_str = dt.strftime("%B %d, %Y at %I:%M %p")
            except Exception:
                date_str = created_at
        else:
            date_str = "Unknown date"

        # Calculate duration
        concluded_at = session.get("concluded_at")
        duration = self._calculate_duration(created_at, concluded_at)

        # Get state
        state = session.get("state", "unknown")
        if state == "concluded":
            state_text = "Completed"
            state_color = ft.Colors.GREEN
        elif state == "active":
            state_text = "Active"
            state_color = ft.Colors.BLUE
        else:
            state_text = "Intro"
            state_color = ft.Colors.ORANGE

        # Get messages
        messages = session.get("messages", [])

        # Build content
        return ft.Column(
            controls=[
                # Header with session info
                ft.Container(
                    padding=16,
                    bgcolor=ft.Colors.SURFACE,
                    border_radius=12,
                    content=ft.Column(
                        controls=[
                            ft.Row(
                                controls=[
                                    ft.Container(
                                        content=ft.Text(
                                            state_text,
                                            size=11,
                                            color=ft.Colors.WHITE,
                                            weight=ft.FontWeight.BOLD,
                                        ),
                                        padding=ft.padding.symmetric(horizontal=10, vertical=5),
                                        border_radius=10,
                                        bgcolor=state_color,
                                    ),
                                    ft.Container(expand=True),
                                    ft.Text(
                                        duration,
                                        size=14,
                                        color=ft.Colors.GREY_600,
                                        weight=ft.FontWeight.BOLD,
                                    ),
                                ],
                            ),
                            ft.Container(height=12),
                            ft.Row(
                                controls=[
                                    ft.Icon(
                                        ft.Icons.CALENDAR_TODAY,
                                        size=16,
                                        color=ft.Colors.GREY_600,
                                    ),
                                    ft.Container(width=8),
                                    ft.Text(
                                        date_str,
                                        size=14,
                                        color=ft.Colors.GREY_700,
                                    ),
                                ],
                            ),
                        ],
                    ),
                ),
                ft.Container(height=16),

                # Summary section (only if available)
                self._build_summary_section(session.get("summary")),

                # Messages section
                ft.Container(height=8),
                ft.Text(
                    "Conversation",
                    size=18,
                    weight=ft.FontWeight.BOLD,
                ),
                ft.Container(height=8),
                ft.Container(
                    expand=True,
                    content=self._build_messages_list(messages),
                ),
            ],
            spacing=0,
            scroll=ft.ScrollMode.AUTO,
        )

    def _build_summary_section(self, summary: Optional[str]) -> ft.Container:
        """Build the summary section if summary exists."""
        if not summary:
            return ft.Container()

        return ft.Container(
            padding=16,
            bgcolor=ft.Colors.DEEP_PURPLE_50,
            border_radius=12,
            content=ft.Column(
                cross_alignment=ft.CrossAxisAlignment.START,
                controls=[
                    ft.Row(
                        controls=[
                            ft.Icon(
                                ft.Icons.SUMMARIZE,
                                size=20,
                                color=ft.Colors.DEEP_PURPLE,
                            ),
                            ft.Container(width=8),
                            ft.Text(
                                "Session Summary",
                                size=16,
                                weight=ft.FontWeight.BOLD,
                                color=ft.Colors.DEEP_PURPLE,
                            ),
                        ],
                    ),
                    ft.Container(height=12),
                    ft.Text(
                        summary,
                        size=14,
                        color=ft.Colors.GREY_800,
                    ),
                ],
            ),
        )

    def _build_messages_list(self, messages: list) -> ft.ListView:
        """Build the messages list."""
        if not messages:
            return ft.ListView(
                controls=[
                    ft.Container(
                        content=ft.Text(
                            "No messages in this session.",
                            size=14,
                            color=ft.Colors.GREY_500,
                            italic=True,
                        ),
                        alignment=ft.alignment.center,
                        padding=24,
                    ),
                ],
            )

        message_controls = []
        for msg in messages:
            is_user = msg.get("role") == "user"
            message_controls.append(self._build_message_bubble(
                msg.get("content", ""),
                is_user,
                msg.get("created_at", "")
            ))

        return ft.ListView(
            expand=True,
            spacing=12,
            padding=ft.padding.all(8),
            controls=message_controls,
        )

    def _build_message_bubble(self, text: str, is_user: bool, timestamp: str = "") -> ft.Container:
        """Build a single message bubble."""
        # Format timestamp if available
        time_str = ""
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p")
            except Exception:
                pass

        if is_user:
            # User message - right aligned
            # Build column controls based on whether we have a timestamp
            column_controls = [ft.Text(
                text,
                size=14,
                color=ft.Colors.ON_SECONDARY_CONTAINER,
            )]
            if time_str:
                column_controls.append(ft.Container(height=4))
                column_controls.append(ft.Text(
                    time_str,
                    size=10,
                    color=ft.Colors.ON_SECONDARY_CONTAINER,
                ))

            return ft.Container(
                content=ft.Container(
                    content=ft.Column(
                        controls=column_controls,
                        cross_alignment=ft.CrossAxisAlignment.END,
                    ),
                    padding=12,
                    border_radius=16,
                    bgcolor=ft.Colors.SECONDARY_CONTAINER,
                ),
                alignment=ft.alignment.center_right,
                margin=ft.margin.only(left=60, right=0, top=4, bottom=4),
            )
        else:
            # Marcus message - left aligned with avatar
            # Build column controls for the name/time row
            name_column_controls = [ft.Text(
                "Marcus Aurelius",
                size=12,
                weight=ft.FontWeight.BOLD,
                color=ft.Colors.DEEP_PURPLE,
            )]
            if time_str:
                name_column_controls.append(ft.Text(
                    time_str,
                    size=10,
                    color=ft.Colors.GREY_500,
                ))

            return ft.Container(
                content=ft.Column(
                    controls=[
                        ft.Row(
                            controls=[
                                ft.CircleAvatar(
                                    content=ft.Text(
                                        "M",
                                        size=14,
                                        color=ft.Colors.WHITE,
                                    ),
                                    bgcolor=ft.Colors.DEEP_PURPLE,
                                    radius=16,
                                ),
                                ft.Container(width=8),
                                ft.Column(
                                    controls=name_column_controls,
                                    spacing=0,
                                ),
                            ],
                        ),
                        ft.Container(height=8),
                        ft.Container(
                            content=ft.Text(
                                text,
                                size=14,
                                color=ft.Colors.ON_PRIMARY_CONTAINER,
                            ),
                            padding=12,
                            border_radius=16,
                            bgcolor=ft.Colors.PRIMARY_CONTAINER,
                        ),
                    ],
                    cross_alignment=ft.CrossAxisAlignment.START,
                ),
                alignment=ft.alignment.center_left,
                margin=ft.margin.only(left=0, right=60, top=4, bottom=4),
            )

    def _calculate_duration(self, created_at: str, concluded_at: Optional[str]) -> str:
        """Calculate session duration in minutes."""
        if not created_at:
            return "N/A"

        try:
            start = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if concluded_at:
                end = datetime.fromisoformat(concluded_at.replace("Z", "+00:00"))
            else:
                end = datetime.now(start.tzinfo) if start.tzinfo else datetime.now()

            duration = end - start
            minutes = int(duration.total_seconds() / 60)

            if minutes < 1:
                return "< 1 min"
            elif minutes == 1:
                return "1 min"
            else:
                return f"{minutes} min"
        except Exception:
            return "N/A"
