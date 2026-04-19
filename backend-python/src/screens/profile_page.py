"""
Profile Page for OpenMarcus.
Profile editing for existing users.
"""

import flet as ft

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


class ProfilePage:
    """Profile page for editing user profile."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        self.profile = None
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
            color=ft.Colors.ERROR,
            visible=False,
        )
        self.success_text = ft.Text(
            color=ft.Colors.GREEN,
            visible=False,
        )
        self.loading = False
        self.loading_indicator = ft.ProgressRing(visible=False)
        self.content_column = None

    def build(self) -> ft.View:
        """Build the profile view."""
        self.content_column = ft.Column(
            controls=[
                self.loading_indicator,
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
        )
        
        view = ft.View(
            route="/profile",
            controls=[
                ft.Row(
                    controls=[
                        self.navigation.build("/profile"),
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
                # Other error - show error message
                self.show_error(error)
            elif result:
                self.profile = result
                self.name_field.value = result.get("name", "")
                self.goals_field.value = result.get("goals", "") or ""
                experience = result.get("experience_level", "beginner")
                self.experience_dropdown.value = experience

        except Exception as e:
            self.show_error(f"Failed to load profile: {str(e)}")

        self.loading = False
        self.loading_indicator.visible = False
        self.update_content()

    def update_content(self) -> None:
        """Update the content column with profile form."""
        if self.content_column:
            self.content_column.controls = [
                ft.Text(
                    "Edit Your Profile",
                    size=32,
                    weight=ft.FontWeight.BOLD,
                ),
                ft.Text(
                    "Update your meditation profile information",
                    size=16,
                    color=ft.Colors.GREY_600,
                ),
                ft.Container(height=32),
                self.error_text,
                self.success_text,
                ft.Container(height=8),
                self.name_field,
                ft.Container(height=16),
                self.goals_field,
                ft.Container(height=16),
                self.experience_dropdown,
                ft.Container(height=32),
                ft.ElevatedButton(
                    "Save Changes",
                    width=300,
                    height=50,
                    on_click=self.handle_save,
                    disabled=self.loading,
                ),
                ft.Container(height=16),
                ft.OutlinedButton(
                    "Cancel",
                    width=300,
                    on_click=lambda _: self.app.navigate_to("/home"),
                ),
            ]
            self.app.page.update()

    def show_error(self, message: str) -> None:
        """Show error message."""
        self.error_text.value = message
        self.error_text.visible = True
        self.success_text.visible = False
        if self.content_column:
            self.app.page.update()

    def show_success(self, message: str) -> None:
        """Show success message."""
        self.success_text.value = message
        self.success_text.visible = True
        self.error_text.visible = False
        if self.content_column:
            self.app.page.update()

    def clear_messages(self) -> None:
        """Clear all messages."""
        self.error_text.value = ""
        self.error_text.visible = False
        self.success_text.value = ""
        self.success_text.visible = False

    def set_loading(self, is_loading: bool) -> None:
        """Set loading state for the form."""
        self.loading = is_loading
        self.loading_indicator.visible = is_loading
        self.name_field.disabled = is_loading
        self.goals_field.disabled = is_loading
        self.experience_dropdown.disabled = is_loading
        if self.content_column:
            self.app.page.update()

    async def handle_save(self, e=None) -> None:
        """Handle save button click."""
        name = self.name_field.value
        goals = self.goals_field.value or ""
        experience = self.experience_dropdown.value

        if not name:
            self.show_error("Please enter your name")
            return

        self.clear_messages()
        self.set_loading(True)

        try:
            result, error = await api_client.update_profile(name, goals, experience)

            if error:
                self.show_error(error)
                self.set_loading(False)
                return

            # Profile updated successfully
            self.show_success("Profile saved successfully!")
            self.set_loading(False)
            
            # Navigate back to home after brief delay
            import asyncio
            asyncio.create_task(self._delayed_navigate())

        except Exception as e:
            self.show_error(f"Failed to save profile: {str(e)}")
            self.set_loading(False)

    async def _delayed_navigate(self) -> None:
        """Navigate to home after brief delay."""
        import asyncio
        await asyncio.sleep(1.5)
        self.app.navigate_to("/home")
