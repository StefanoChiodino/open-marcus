"""
History Page for OpenMarcus.
Display past meditation sessions.
"""

import flet as ft
import asyncio
from datetime import datetime
from typing import Optional

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


class HistoryPage:
    """History page showing list of past sessions."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        self.sessions: list = []
        self.loading = True
        self.loading_indicator = ft.ProgressRing(visible=True)
        self.error_text = ft.Text(
            "",
            color=ft.Colors.ERROR,
            size=14,
            visible=False,
        )
        self.sessions_count_text: Optional[ft.Text] = None
        self.content_column: Optional[ft.Column] = None

    def build(self) -> ft.View:
        """Build the history view."""
        # Create content column that will be populated after sessions load
        self.content_column = ft.Column(
            controls=[
                ft.Container(
                    padding=ft.padding.all(24),
                    content=ft.Column(
                        controls=[
                            ft.Text(
                                "Your Meditation Journey",
                                size=28,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Container(height=8),
                            self.loading_indicator,
                        ],
                    ),
                ),
                ft.Container(
                    expand=True,
                    padding=ft.padding.symmetric(horizontal=24),
                    content=self.build_sessions_list(),
                ),
            ],
        )

        view = ft.View(
            route="/history",
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
                                                    on_click=lambda _: self.app.navigate_to("/home"),
                                                ),
                                                ft.Text(
                                                    "Session History",
                                                    size=18,
                                                    weight=ft.FontWeight.BOLD,
                                                ),
                                            ],
                                        ),
                                    ),
                                    self.error_text,
                                    ft.Container(
                                        expand=True,
                                        content=self.content_column,
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

        # Start loading sessions data
        asyncio.create_task(self.load_sessions())

        return view

    async def load_sessions(self) -> None:
        """Load sessions from API."""
        self.loading = True
        self.loading_indicator.visible = True
        self.error_text.visible = False
        self.app.page.update()

        try:
            result, error = await api_client.list_sessions(limit=50, offset=0)

            if error:
                self.error_text.value = f"Failed to load sessions: {error}"
                self.error_text.visible = True
            elif result and "sessions" in result:
                # Convert API response to display format
                self.sessions = []
                for session in result["sessions"]:
                    # Format the created_at date
                    created_at = session.get("created_at", "")
                    if created_at:
                        try:
                            # Parse ISO format date
                            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                            date_str = self._format_date(dt)
                        except Exception:
                            date_str = created_at
                    else:
                        date_str = "Unknown date"

                    # Calculate duration if concluded
                    concluded_at = session.get("concluded_at")
                    duration = self._calculate_duration(created_at, concluded_at)

                    self.sessions.append({
                        "id": session.get("id", ""),
                        "title": f"Session from {date_str.split(',')[0]}",
                        "date": date_str,
                        "summary": session.get("summary") or "No summary available",
                        "duration": duration,
                        "state": session.get("state", "unknown"),
                    })
            else:
                self.sessions = []

        except Exception as e:
            self.error_text.value = f"Error loading sessions: {str(e)}"
            self.error_text.visible = True
            self.sessions = []

        self.loading = False
        self.loading_indicator.visible = False
        self.update_content()

    def _format_date(self, dt: datetime) -> str:
        """Format datetime to human-readable string."""
        now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
        today = now.date()
        session_date = dt.date()

        if session_date == today:
            return f"Today, {dt.strftime('%I:%M %p')}"
        elif session_date == today.replace(day=today.day - 1):
            return f"Yesterday, {dt.strftime('%I:%M %p')}"
        else:
            return dt.strftime("%B %d, %Y, %I:%M %p")

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

    def update_content(self) -> None:
        """Update the content with loaded sessions."""
        if self.content_column:
            # Update sessions count
            self.content_column.controls[0].content.controls[2] = ft.Text(
                f"{len(self.sessions)} sessions with Marcus Aurelius",
                size=14,
                color=ft.Colors.GREY_600,
            )
            # Update the list
            self.content_column.controls[1].content = self.build_sessions_list()
            self.app.page.update()

    def build_sessions_list(self) -> ft.ListView:
        """Build the sessions list."""
        if not self.sessions:
            return ft.ListView(
                controls=[
                    ft.Container(
                        content=ft.Text(
                            "No sessions yet. Start your first meditation!",
                            size=16,
                            color=ft.Colors.GREY_500,
                            italic=True,
                        ),
                        alignment=ft.alignment.center,
                        padding=40,
                    ),
                ],
            )

        session_cards = []
        for session in self.sessions:
            # Determine state badge color
            state = session.get("state", "unknown")
            if state == "concluded":
                state_color = ft.Colors.GREEN
                state_text = "Completed"
            elif state == "active":
                state_color = ft.Colors.BLUE
                state_text = "Active"
            else:
                state_color = ft.Colors.ORANGE
                state_text = "Intro"

            session_cards.append(
                ft.Card(
                    content=ft.Container(
                        padding=16,
                        content=ft.Column(
                            cross_alignment=ft.CrossAxisAlignment.START,
                            controls=[
                                ft.Row(
                                    controls=[
                                        ft.Container(
                                            content=ft.Text(
                                                state_text,
                                                size=10,
                                                color=ft.Colors.WHITE,
                                                weight=ft.FontWeight.BOLD,
                                            ),
                                            padding=ft.padding.symmetric(horizontal=8, vertical=4),
                                            border_radius=8,
                                            bgcolor=state_color,
                                        ),
                                        ft.Container(width=8),
                                        ft.Text(
                                            session.get("title", ""),
                                            size=18,
                                            weight=ft.FontWeight.BOLD,
                                            expand=True,
                                        ),
                                        ft.Container(expand=True),
                                        ft.Icon(
                                            ft.Icons.CHEVRON_RIGHT,
                                            color=ft.Colors.GREY_400,
                                        ),
                                    ],
                                ),
                                ft.Container(height=8),
                                ft.Row(
                                    controls=[
                                        ft.Icon(
                                            ft.Icons.SCHEDULE,
                                            size=14,
                                            color=ft.Colors.GREY_600,
                                        ),
                                        ft.Container(width=4),
                                        ft.Text(
                                            session.get("duration", ""),
                                            size=12,
                                            color=ft.Colors.GREY_600,
                                        ),
                                        ft.Container(width=16),
                                        ft.Icon(
                                            ft.Icons.CALENDAR_TODAY,
                                            size=14,
                                            color=ft.Colors.GREY_600,
                                        ),
                                        ft.Container(width=4),
                                        ft.Text(
                                            session.get("date", ""),
                                            size=12,
                                            color=ft.Colors.GREY_600,
                                        ),
                                    ],
                                ),
                                ft.Container(height=12),
                                ft.Text(
                                    session.get("summary", ""),
                                    size=14,
                                    color=ft.Colors.GREY_700,
                                    max_lines=2,
                                    overflow=ft.TextOverflow.ELLIPSIS,
                                ),
                                ft.Container(height=12),
                                ft.Row(
                                    controls=[
                                        ft.Container(
                                            content=ft.Text(
                                                "View Details →",
                                                size=12,
                                                color=ft.Colors.DEEP_PURPLE,
                                                weight=ft.FontWeight.BOLD,
                                            ),
                                            on_click=lambda e, s=session: self.view_session(s),
                                        ),
                                    ],
                                ),
                            ],
                        ),
                    ),
                    on_click=lambda e, s=session: self.view_session(s),
                ),
            )
            session_cards.append(ft.Container(height=12))

        return ft.ListView(
            expand=True,
            controls=session_cards,
        )

    def view_session(self, session: dict) -> None:
        """Navigate to session detail."""
        # Store the session ID in the app state and navigate to detail page
        self.app.current_session_id = session.get("id")
        self.app.navigate_to(f"/session/{session['id']}")
