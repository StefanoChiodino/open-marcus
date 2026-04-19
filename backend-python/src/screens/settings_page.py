"""
Settings Page for OpenMarcus.
App configuration and preferences.
"""

import flet as ft

from src.screens.navigation import NavigationSidebar


class SettingsPage:
    """Settings page with app configuration options."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        self.tts_voice = ft.Dropdown(
            label="Text-to-Speech Voice",
            width=400,
            options=[
                ft.dropdown.Option("default", "Default Voice"),
                ft.dropdown.Option("male", "Male Voice"),
                ft.dropdown.Option("female", "Female Voice"),
            ],
            value="default",
        )
        self.stt_enabled = ft.Switch(
            label="Enable Voice Input",
            value=True,
        )
        self.ai_model = ft.Dropdown(
            label="AI Model",
            width=400,
            options=[
                ft.dropdown.Option("llama-3.2-1b", "Llama 3.2 1B (Fast, Low RAM)"),
                ft.dropdown.Option("llama-3.2-3b", "Llama 3.2 3B (Balanced)"),
                ft.dropdown.Option("mistral-7b", "Mistral 7B (High Quality)"),
            ],
            value="llama-3.2-1b",
        )

    def build(self) -> ft.View:
        """Build the settings view."""
        return ft.View(
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
                                                        ft.Text(
                                                            "Detecting...",
                                                            size=14,
                                                            color=ft.Colors.GREY_600,
                                                        ),
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
                                ],
                            ),
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
            ],
        )

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

    def handle_export(self, e):
        """Handle data export."""
        pass  # Placeholder for export functionality

    def handle_clear_data(self, e):
        """Handle data clear."""
        pass  # Placeholder for clear functionality
