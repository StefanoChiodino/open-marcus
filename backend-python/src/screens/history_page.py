"""
History Page for OpenMarcus.
Display past meditation sessions.
"""

import flet as ft


class HistoryPage:
    """History page showing list of past sessions."""

    def __init__(self, app):
        self.app = app
        self.sessions = [
            {
                "id": "1",
                "title": "Morning Meditation",
                "date": "Today, 8:00 AM",
                "summary": "Discussed the importance of morning reflection and preparation for the day ahead.",
                "duration": "15 min",
            },
            {
                "id": "2",
                "title": "Evening Wind Down",
                "date": "Yesterday, 9:00 PM",
                "summary": "Explored techniques for letting go of the day's events and finding inner peace.",
                "duration": "20 min",
            },
        ]

    def build(self) -> ft.View:
        """Build the history view."""
        return ft.View(
            route="/history",
            controls=[
                ft.AppBar(
                    title=ft.Text("Session History"),
                    center_title=True,
                    leading=ft.IconButton(
                        icon=ft.icons.ARROW_BACK,
                        on_click=lambda _: self.app.navigate_to("/home"),
                    ),
                ),
                ft.Container(
                    expand=True,
                    padding=ft.padding.all(24),
                    content=ft.Column(
                        controls=[
                            ft.Text(
                                "Your Meditation Journey",
                                size=28,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Container(height=8),
                            ft.Text(
                                f"{len(self.sessions)} sessions with Marcus Aurelius",
                                size=14,
                                color=ft.Colors.GREY_600,
                            ),
                            ft.Container(height=24),
                            self.build_sessions_list(),
                        ],
                        scroll=ft.ScrollMode.AUTO,
                    ),
                ),
            ],
        )

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
            session_cards.append(
                ft.Card(
                    content=ft.Container(
                        padding=16,
                        content=ft.Column(
                            cross_alignment=ft.CrossAxisAlignment.START,
                            controls=[
                                ft.Row(
                                    controls=[
                                        ft.Column(
                                            controls=[
                                                ft.Text(
                                                    session.get("title", ""),
                                                    size=18,
                                                    weight=ft.FontWeight.BOLD,
                                                ),
                                                ft.Container(height=4),
                                                ft.Row(
                                                    controls=[
                                                        ft.Icon(
                                                            ft.icons.SCHEDULE,
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
                                                            ft.icons.CALENDAR_TODAY,
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
                                            ],
                                        ),
                                        ft.Container(expand=True),
                                        ft.Icon(
                                            ft.icons.CHEVRON_RIGHT,
                                            color=ft.Colors.GREY_400,
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
                                                "View Details",
                                                size=12,
                                                color=ft.Colors.DEEP_PURPLE,
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

    def view_session(self, session):
        """Navigate to session detail."""
        # Placeholder - would navigate to detail page
        pass
