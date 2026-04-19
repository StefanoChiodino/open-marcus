"""
Home Page for OpenMarcus.
Welcome screen with profile display and session start.
"""

import flet as ft


class HomePage:
    """Home page displaying welcome message and profile."""

    def __init__(self, app):
        self.app = app
        self.user_name = "Guest User"
        self.meditation_goals = "Not set"
        self.experience_level = "Beginner"

    def build(self) -> ft.View:
        """Build the home view."""
        return ft.View(
            route="/home",
            controls=[
                ft.AppBar(
                    title=ft.Text("OpenMarcus"),
                    center_title=True,
                    actions=[
                        ft.IconButton(icon=ft.icons.HISTORY, on_click=lambda _: self.app.navigate_to("/history")),
                        ft.IconButton(icon=ft.icons.SETTINGS, on_click=lambda _: self.app.navigate_to("/settings")),
                    ],
                ),
                ft.Container(
                    expand=True,
                    padding=ft.padding.all(24),
                    content=ft.Column(
                        controls=[
                            # Welcome header
                            ft.Container(
                                padding=24,
                                border_radius=16,
                                bgcolor=ft.colors.DEEP_PURPLE_50,
                                content=ft.Column(
                                    controls=[
                                        ft.Text(
                                            f"Welcome, {self.user_name}",
                                            size=32,
                                            weight=ft.FontWeight.BOLD,
                                        ),
                                        ft.Container(height=8),
                                        ft.Text(
                                            "Your personal Stoic meditation companion",
                                            size=16,
                                            color=ft.colors.GREY_700,
                                        ),
                                    ],
                                ),
                            ),
                            ft.Container(height=32),
                            # Profile card
                            ft.Card(
                                content=ft.Container(
                                    padding=20,
                                    content=ft.Column(
                                        controls=[
                                            ft.Row(
                                                controls=[
                                                    ft.Icon(
                                                        ft.icons.PERSON,
                                                        size=24,
                                                        color=ft.colors.DEEP_PURPLE,
                                                    ),
                                                    ft.Text(
                                                        "Your Profile",
                                                        size=20,
                                                        weight=ft.FontWeight.BOLD,
                                                    ),
                                                ],
                                            ),
                                            ft.Container(height=16),
                                            ft.Divider(height=1),
                                            ft.Container(height=16),
                                            ft.Row(
                                                controls=[
                                                    ft.Text(
                                                        "Name:",
                                                        weight=ft.FontWeight.BOLD,
                                                        width=140,
                                                    ),
                                                    ft.Text(self.user_name),
                                                ],
                                            ),
                                            ft.Container(height=8),
                                            ft.Row(
                                                controls=[
                                                    ft.Text(
                                                        "Goals:",
                                                        weight=ft.FontWeight.BOLD,
                                                        width=140,
                                                    ),
                                                    ft.Text(self.meditation_goals),
                                                ],
                                            ),
                                            ft.Container(height=8),
                                            ft.Row(
                                                controls=[
                                                    ft.Text(
                                                        "Experience:",
                                                        weight=ft.FontWeight.BOLD,
                                                        width=140,
                                                    ),
                                                    ft.Text(self.experience_level.capitalize()),
                                                ],
                                            ),
                                        ],
                                    ),
                                ),
                            ),
                            ft.Container(height=32),
                            # Begin meditation button
                            ft.Container(
                                alignment=ft.alignment.center,
                                content=ft.ElevatedButton(
                                    "Begin Meditation",
                                    icon=ft.icons.PLAY_ARROW,
                                    icon_color=ft.colors.WHITE,
                                    bgcolor=ft.colors.DEEP_PURPLE,
                                    color=ft.colors.WHITE,
                                    width=300,
                                    height=56,
                                    style=ft.ButtonStyle(
                                        shape=ft.RoundedRectangleBorder(radius=12),
                                    ),
                                    on_click=lambda _: self.app.navigate_to("/session"),
                                ),
                            ),
                            ft.Container(height=16),
                            # Quick actions
                            ft.Row(
                                controls=[
                                    ft.OutlinedButton(
                                        "View History",
                                        icon=ft.icons.HISTORY,
                                        on_click=lambda _: self.app.navigate_to("/history"),
                                    ),
                                    ft.OutlinedButton(
                                        "Settings",
                                        icon=ft.icons.SETTINGS,
                                        on_click=lambda _: self.app.navigate_to("/settings"),
                                    ),
                                ],
                                alignment=ft.MainAxisAlignment.CENTER,
                            ),
                        ],
                        scroll=ft.ScrollMode.AUTO,
                    ),
                ),
            ],
        )
