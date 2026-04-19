"""
Onboarding Screen for OpenMarcus.
Profile creation for new users.
"""

import flet as ft


class OnboardingScreen:
    """Onboarding screen for profile creation."""

    def __init__(self, app):
        self.app = app
        self.name_field = ft.TextField(
            label="Your Name",
            width=400,
            autofocus=True,
        )
        self.goals_field = ft.TextField(
            label="Meditation Goals (What do you hope to achieve?)",
            width=400,
            multiline=True,
            min_lines=3,
        )
        self.experience_dropdown = ft.Dropdown(
            label="Experience Level",
            width=400,
            options=[
                ft.dropdown.Option("beginner", "Beginner"),
                ft.dropdown.Option("intermediate", "Intermediate"),
                ft.dropdown.Option("advanced", "Advanced"),
            ],
            value="beginner",
        )
        self.error_text = ft.Text(
            color=ft.colors.ERROR,
            visible=False,
        )

    def build(self) -> ft.View:
        """Build the onboarding view."""
        return ft.View(
            route="/onboarding",
            controls=[
                ft.Container(
                    alignment=ft.alignment.center,
                    expand=True,
                    content=ft.Column(
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        controls=[
                            ft.Text(
                                "Welcome to OpenMarcus",
                                size=36,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Text(
                                "Let's set up your meditation profile",
                                size=16,
                                color=ft.colors.GREY_600,
                            ),
                            ft.Container(height=40),
                            self.error_text,
                            ft.Container(height=8),
                            self.name_field,
                            ft.Container(height=16),
                            self.goals_field,
                            ft.Container(height=16),
                            self.experience_dropdown,
                            ft.Container(height=32),
                            ft.ElevatedButton(
                                "Continue",
                                width=300,
                                height=50,
                                on_click=self.handle_continue,
                            ),
                        ],
                    ),
                ),
            ],
        )

    def handle_continue(self, e):
        """Handle continue button click."""
        name = self.name_field.value
        goals = self.goals_field.value
        experience = self.experience_dropdown.value

        if not name:
            self.error_text.value = "Please enter your name"
            self.error_text.visible = True
            self.app.page.update()
            return

        # Placeholder for actual profile creation
        self.error_text.value = ""
        self.error_text.visible = False
        self.app.navigate_to("/home")
