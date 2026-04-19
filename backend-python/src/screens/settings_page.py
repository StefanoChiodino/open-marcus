"""
Settings Page for OpenMarcus.
App configuration and preferences.
"""

import platform

import flet as ft

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


class SettingsPage:
    """Settings page with app configuration options."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        self.settings = None
        self.ram_display = ft.Text(
            "Detecting...",
            size=14,
            color=ft.Colors.GREY_600,
        )
        self.loading_indicator = ft.ProgressRing(visible=False)
        self.content_column = None
        self.loading = False

        # TTS voice options
        self.tts_voice = ft.Dropdown(
            label="Text-to-Speech Voice",
            width=400,
            options=[
                ft.dropdown.Option("en_US-lessac-medium", "Lessac Medium (Default)"),
                ft.dropdown.Option("en_US-lessac-high", "Lessac High"),
                ft.dropdown.Option("en_US-amy-medium", "Amy Medium"),
            ],
            value="en_US-lessac-medium",
            on_change=self.handle_tts_voice_change,
        )
        self.stt_enabled = ft.Switch(
            label="Enable Voice Input",
            value=True,
            on_change=self.handle_stt_enabled_change,
        )

        # AI model options
        self.ai_model = ft.Dropdown(
            label="AI Model",
            width=400,
            options=[
                ft.dropdown.Option("llama-3.2-1b", "Llama 3.2 1B (Fast, Low RAM)"),
                ft.dropdown.Option("llama-3.2-3b", "Llama 3.2 3B (Balanced)"),
                ft.dropdown.Option("mistral-7b", "Mistral 7B (High Quality)"),
                ft.dropdown.Option("phi-3-mini", "Phi-3 Mini (Compact)"),
            ],
            value="llama-3.2-1b",
            on_change=self.handle_model_change,
        )

        self.status_message = ft.Text(
            "",
            size=12,
            visible=False,
        )

    def build(self) -> ft.View:
        """Build the settings view."""
        self.content_column = ft.Column(
            controls=[
                self.loading_indicator,
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
        )

        view = ft.View(
            route="/settings",
            controls=[
                ft.Row(
                    controls=[
                        self.navigation.build("/settings"),
                        ft.VerticalDivider(width=1),
                        ft.Container(
                            expand=True,
                            padding=ft.padding.all(24),
                            content=ft.ListView(
                                controls=[
                                    self.content_column,
                                ],
                            ),
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
            ],
        )

        # Start loading settings data (async)
        import asyncio
        asyncio.create_task(self.load_settings())

        return view

    async def load_settings(self) -> None:
        """Load settings from API."""
        self.loading = True
        self.loading_indicator.visible = True
        self.app.page.update()

        try:
            # Load settings
            result, error = await api_client.get_settings()

            if error:
                # If settings don't exist yet, that's okay - use defaults
                print(f"Could not load settings: {error}")

            if result:
                self.settings = result
                # Update UI with loaded settings
                self.tts_voice.value = result.get("tts_voice", "en_US-lessac-medium")
                self.stt_enabled.value = result.get("stt_enabled", True)
                self.ai_model.value = result.get("selected_model", "llama-3.2-1b")
                if result.get("ram_detected"):
                    self.ram_display.value = f"{result['ram_detected']:.1f} GB"
            else:
                # Try to get system RAM anyway
                await self.load_system_ram()

        except Exception as e:
            print(f"Error loading settings: {e}")
            await self.load_system_ram()

        self.loading = False
        self.loading_indicator.visible = False
        self.update_content()

    async def load_system_ram(self) -> None:
        """Load system RAM information."""
        try:
            result, error = await api_client.get_system_info()
            if result and not error:
                ram_gb = result.get("ram_total_gb", 0)
                self.ram_display.value = f"{ram_gb:.1f} GB"
            else:
                # Fallback to local detection
                self.ram_display.value = self.get_local_ram_gb()
        except Exception as e:
            print(f"Error loading system info: {e}")
            self.ram_display.value = self.get_local_ram_gb()

    def get_local_ram_gb(self) -> str:
        """Get RAM locally as fallback."""
        try:
            if platform.system() == "Darwin":
                import subprocess
                result = subprocess.run(
                    ["sysctl", "-n", "hw.memsize"],
                    capture_output=True,
                    text=True
                )
                bytes_mem = int(result.stdout.strip())
                gb = bytes_mem / (1024 ** 3)
                return f"{gb:.1f} GB"
        except Exception:
            pass
        return "Unknown"

    def update_content(self) -> None:
        """Update the content column with settings."""
        if self.content_column:
            self.content_column.controls = [
                # Header
                ft.Text(
                    "Configuration",
                    size=28,
                    weight=ft.FontWeight.BOLD,
                ),
                ft.Container(height=24),
                # TTS Section
                self.build_section(
                    title="Text-to-Speech",
                    icon=ft.Icons.VOLUME_UP,
                    controls=[
                        self.tts_voice,
                    ],
                ),
                ft.Container(height=16),
                # STT Section
                self.build_section(
                    title="Speech-to-Text",
                    icon=ft.Icons.MIC,
                    controls=[
                        self.stt_enabled,
                        ft.Container(height=8),
                        ft.Text(
                            "Allow voice input for meditation sessions",
                            size=12,
                            color=ft.Colors.GREY_600,
                        ),
                    ],
                ),
                ft.Container(height=16),
                # AI Model Section
                self.build_section(
                    title="AI Model",
                    icon=ft.Icons.PSYCHOLOGY,
                    controls=[
                        self.ai_model,
                        ft.Container(height=8),
                        ft.Text(
                            "Select the AI model for meditation conversations",
                            size=12,
                            color=ft.Colors.GREY_600,
                        ),
                        ft.Container(height=12),
                        ft.Container(
                            content=ft.Row(
                                controls=[
                                    ft.Icon(
                                        ft.Icons.INFO_OUTLINE,
                                        size=16,
                                        color=ft.Colors.BLUE,
                                    ),
                                    ft.Container(width=8),
                                    ft.Text(
                                        "Smaller models use less RAM but may be less nuanced",
                                        size=12,
                                        color=ft.Colors.GREY_600,
                                    ),
                                ],
                            ),
                        ),
                    ],
                ),
                ft.Container(height=16),
                # Data Management Section
                self.build_section(
                    title="Data Management",
                    icon=ft.Icons.FOLDER,
                    controls=[
                        ft.Row(
                            controls=[
                                ft.ElevatedButton(
                                    "Export Data",
                                    icon=ft.Icons.DOWNLOAD,
                                    on_click=self.handle_export,
                                ),
                                ft.Container(width=12),
                                ft.OutlinedButton(
                                    "Clear All Data",
                                    icon=ft.Icons.DELETE,
                                    icon_color=ft.Colors.ERROR,
                                    on_click=self.handle_clear_data,
                                ),
                            ],
                        ),
                        ft.Container(height=8),
                        ft.Text(
                            "Export your data for backup or clear all data to start fresh",
                            size=12,
                            color=ft.Colors.GREY_600,
                        ),
                    ],
                ),
                ft.Container(height=32),
                # System Info
                ft.Container(
                    content=ft.Column(
                        controls=[
                            ft.Divider(),
                            ft.Container(height=16),
                            ft.Row(
                                controls=[
                                    ft.Text(
                                        "System RAM:",
                                        size=14,
                                        weight=ft.FontWeight.BOLD,
                                    ),
                                    self.ram_display,
                                ],
                            ),
                            ft.Container(height=8),
                            ft.Row(
                                controls=[
                                    ft.Text(
                                        "App Version:",
                                        size=14,
                                        weight=ft.FontWeight.BOLD,
                                    ),
                                    ft.Text(
                                        "0.1.0",
                                        size=14,
                                        color=ft.Colors.GREY_600,
                                    ),
                                ],
                            ),
                        ],
                    ),
                    alignment=ft.alignment.center,
                ),
                ft.Container(height=16),
                self.status_message,
            ]
            self.app.page.update()

    def build_section(
        self,
        title: str,
        icon: str,
        controls: list,
    ) -> ft.Card:
        """Build a settings section card."""
        return ft.Card(
            content=ft.Container(
                padding=16,
                content=ft.Column(
                    controls=[
                        ft.Row(
                            controls=[
                                ft.Icon(icon, size=24, color=ft.Colors.DEEP_PURPLE),
                                ft.Container(width=12),
                                ft.Text(
                                    title,
                                    size=18,
                                    weight=ft.FontWeight.BOLD,
                                ),
                            ],
                        ),
                        ft.Container(height=12),
                        *controls,
                    ],
                ),
            ),
        )

    async def handle_tts_voice_change(self, e: ft.ControlEvent) -> None:
        """Handle TTS voice selection change."""
        await self.save_settings({"tts_voice": self.tts_voice.value})

    async def handle_stt_enabled_change(self, e: ft.ControlEvent) -> None:
        """Handle STT enabled toggle change."""
        await self.save_settings({"stt_enabled": self.stt_enabled.value})

    async def handle_model_change(self, e: ft.ControlEvent) -> None:
        """Handle AI model selection change."""
        await self.save_settings({"selected_model": self.ai_model.value})

    async def save_settings(self, updates: dict) -> None:
        """Save settings to API."""
        try:
            result, error = await api_client.update_settings(updates)
            if error:
                self.show_status(f"Failed to save: {error}", is_error=True)
            else:
                self.show_status("Settings saved", is_error=False)
        except Exception as e:
            self.show_status(f"Error: {str(e)}", is_error=True)

    def show_status(self, message: str, is_error: bool = False) -> None:
        """Show a status message."""
        self.status_message.value = message
        self.status_message.color = ft.Colors.ERROR if is_error else ft.Colors.GREEN
        self.status_message.visible = True
        if self.content_column:
            self.app.page.update()
        # Hide after 3 seconds
        import asyncio
        asyncio.create_task(self._hide_status_after_delay())

    async def _hide_status_after_delay(self) -> None:
        """Hide status message after delay."""
        import asyncio
        await asyncio.sleep(3)
        self.status_message.visible = False
        if self.content_column:
            self.app.page.update()

    async def handle_export(self, e: ft.ControlEvent) -> None:
        """Handle data export."""
        from flet import FilePicker, FilePickerResultEvent
        import os
        
        # Show status that export is starting
        self.show_status("Preparing export...", is_error=False)
        
        # First, export as JSON
        result, error = await api_client.export_data("json")
        
        if error:
            self.show_status(f"Export failed: {error}", is_error=True)
            return
        
        if result:
            # Save the file using FilePicker
            try:
                # Get the downloads directory
                downloads_dir = os.path.expanduser("~/Downloads")
                export_path = os.path.join(downloads_dir, "openMarcus_export.json")
                
                with open(export_path, "wb") as f:
                    f.write(result)
                
                self.show_status(f"Data exported to Downloads folder", is_error=False)
            except Exception as ex:
                self.show_status(f"Export failed to save: {str(ex)}", is_error=True)
        else:
            self.show_status("Export failed: No data returned", is_error=True)

    async def handle_clear_data(self, e: ft.ControlEvent) -> None:
        """Handle data clear."""
        # Show confirmation dialog
        dialog = ft.AlertDialog(
            modal=True,
            title=ft.Text("Clear All Data"),
            content=ft.Text(
                "Are you sure you want to clear all your data? This action cannot be undone.\n\n"
                "All your sessions, profile, memories, and settings will be permanently deleted."
            ),
            actions=[
                ft.TextButton("Cancel", on_click=self._cancel_clear_data),
                ft.TextButton(
                    "Clear All Data",
                    on_click=self._confirm_clear_data,
                    style=ft.ButtonStyle(color=ft.Colors.ERROR)
                ),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )
        
        self.app.page.dialog = dialog
        dialog.open = True
        self.app.page.update()

    async def _cancel_clear_data(self, e: ft.ControlEvent) -> None:
        """Cancel data clear operation."""
        if self.app.page.dialog:
            self.app.page.dialog.open = False
            self.app.page.update()

    async def _confirm_clear_data(self, e: ft.ControlEvent) -> None:
        """Confirm and execute data clear."""
        if self.app.page.dialog:
            self.app.page.dialog.open = False
            self.app.page.update()
        
        self.show_status("Clearing all data...", is_error=False)
        
        result, error = await api_client.clear_all_data()
        
        if error:
            self.show_status(f"Failed to clear data: {error}", is_error=True)
            return
        
        if result and result.get("message"):
            self.show_status("All data cleared successfully", is_error=False)
            # Logout the user after clearing data
            await self._logout_after_clear()
        else:
            self.show_status("Data cleared", is_error=False)

    async def _logout_after_clear(self) -> None:
        """Logout user after clearing data."""
        api_client.clear_token()
        # Navigate to login screen
        self.app.remove_all_views()
        from src.screens.login_screen import LoginScreen
        login = LoginScreen(self.app)
        self.app.add_view(login.build())
