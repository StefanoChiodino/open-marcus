"""
Home Page for OpenMarcus.
Welcome screen with profile display and session start.
"""

import flet as ft

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


class HomePage:
    """Home page displaying welcome message and profile."""

    def __init__(self, app):
        self.app = app
        self.user_name = "Guest User"
        self.meditation_goals = "Not set"
        self.experience_level = "Beginner"
        self.profile = None
        self.loading = True
        self.loading_indicator = ft.ProgressRing(visible=True)
        self.content_column = None
        self.navigation = NavigationSidebar(app)

    def build(self) -> ft.View:
        """Build the home view."""
        # Create content column that will be populated after profile loads
        self.content_column = ft.Column(
            controls=[
                self.loading_indicator,
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            expand=True,
        )
        
        view = ft.View(
            route="/home",
            controls=[
                ft.Row(
                    controls=[
                        self.navigation.build("/home"),
                        ft.VerticalDivider(width=1),
                        ft.Container(
                            expand=True,
                            padding=ft.padding.all(24),
                            content=self.content_column,
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
            ],
        )
        
        # Start loading profile data (async)
        import asyncio
        asyncio.create_task(self.load_profile())
        
        return view

    async def load_profile(self) -> None:
        """Load profile data from API."""
        self.loading = True
        self.loading_indicator.visible = True
        self.app.page.update()

        try:
            result, error = await api_client.get_profile()

            if error:
                if "Not found" in error:
                    # No profile exists - redirect to onboarding
                    self.app.navigate_to("/onboarding")
                    return
                # Other error - show default values
                self.user_name = "Guest User"
                self.meditation_goals = "Not set"
                self.experience_level = "Beginner"
            elif result:
                self.profile = result
                self.user_name = result.get("name", "Guest User")
                self.meditation_goals = result.get("goals", "Not set") or "Not set"
                experience = result.get("experience_level", "beginner")
                self.experience_level = experience.capitalize() if experience else "Beginner"

        except Exception as e:
            print(f"Error loading profile: {e}")
            self.user_name = "Guest User"
            self.meditation_goals = "Not set"
            self.experience_level = "Beginner"

        self.loading = False
        self.loading_indicator.visible = False
        self.update_content()

    def update_content(self) -> None:
        """Update the content column with profile data."""
        if self.content_column:
            self.content_column.controls = [
                # Welcome header
                ft.Container(
                    padding=24,
                    border_radius=16,
                    bgcolor=ft.Colors.DEEP_PURPLE_50,
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
                                color=ft.Colors.GREY_700,
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
                                            ft.Icons.PERSON,
                                            size=24,
                                            color=ft.Colors.DEEP_PURPLE,
                                        ),
                                        ft.Text(
                                            "Your Profile",
                                            size=20,
                                            weight=ft.FontWeight.BOLD,
                                        ),
                                        ft.Container(expand=True),
                                        ft.TextButton(
                                            "Edit",
                                            icon=ft.Icons.EDIT,
                                            on_click=lambda _: self.app.navigate_to("/profile"),
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
                                        ft.Text(self.experience_level),
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
                        icon=ft.Icons.PLAY_ARROW,
                        icon_color=ft.Colors.WHITE,
                        bgcolor=ft.Colors.DEEP_PURPLE,
                        color=ft.Colors.WHITE,
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
                            icon=ft.Icons.HISTORY,
                            on_click=lambda _: self.app.navigate_to("/history"),
                        ),
                        ft.OutlinedButton(
                            "Settings",
                            icon=ft.Icons.SETTINGS,
                            on_click=lambda _: self.app.navigate_to("/settings"),
                        ),
                    ],
                    alignment=ft.MainAxisAlignment.CENTER,
                ),
            ]
            self.app.page.update()
