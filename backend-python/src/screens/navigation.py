"""
Navigation component for OpenMarcus.
Persistent sidebar navigation for authenticated pages.
"""

import flet as ft


class NavigationSidebar:
    """Sidebar navigation for the app."""

    def __init__(self, app):
        self.app = app
        self.selected_index = 0
        self.navigation_items = [
            ft.NavigationRailDestination(
                icon=ft.Icons.HOME_OUTLINED,
                selected_icon=ft.Icons.HOME,
                label="Home",
            ),
            ft.NavigationRailDestination(
                icon=ft.Icons.HISTORY_OUTLINED,
                selected_icon=ft.Icons.HISTORY,
                label="History",
            ),
            ft.NavigationRailDestination(
                icon=ft.Icons.SETTINGS_OUTLINED,
                selected_icon=ft.Icons.SETTINGS,
                label="Settings",
            ),
            ft.NavigationRailDestination(
                icon=ft.Icons.PERSON_OUTLINED,
                selected_icon=ft.Icons.PERSON,
                label="Profile",
            ),
        ]

    def build(self, current_route: str) -> ft.NavigationRail:
        """Build the navigation rail component."""
        # Update selected index based on current route
        self.selected_index = self._get_selected_index(current_route)

        return ft.NavigationRail(
            selected_index=self.selected_index,
            label_type=ft.NavigationRailLabelType.ALL,
            min_width=100,
            min_extended_width=200,
            destinations=self.navigation_items,
            on_change=self.on_navigation_change,
            leading=ft.Container(
                content=ft.Column(
                    controls=[
                        ft.Container(
                            content=ft.CircleAvatar(
                                content=ft.Text(
                                    "M",
                                    size=24,
                                    color=ft.Colors.WHITE,
                                    weight=ft.FontWeight.BOLD,
                                ),
                                bgcolor=ft.Colors.DEEP_PURPLE,
                                radius=24,
                            ),
                            padding=ft.padding.all(8),
                        ),
                        ft.Container(height=8),
                    ],
                ),
                alignment=ft.alignment.center,
            ),
            trailing=ft.Container(
                expand=True,
                alignment=ft.alignment.bottom_center,
                content=ft.Column(
                    controls=[
                        ft.Container(height=8),
                        ft.IconButton(
                            icon=ft.Icons.LOGOUT,
                            tooltip="Logout",
                            on_click=self.handle_logout,
                        ),
                    ],
                ),
            ),
        )

    def _get_selected_index(self, route: str) -> int:
        """Get the selected index based on current route."""
        route_mapping = {
            "/home": 0,
            "/history": 1,
            "/settings": 2,
            "/profile": 3,
        }
        return route_mapping.get(route, 0)

    def on_navigation_change(self, e: ft.ControlEvent) -> None:
        """Handle navigation selection."""
        routes = ["/home", "/history", "/settings", "/profile"]
        if 0 <= e.control.selected_index < len(routes):
            self.app.navigate_to(routes[e.control.selected_index])

    def handle_logout(self, e) -> None:
        """Handle logout action."""
        # Clear any stored tokens and navigate to login
        from src.services.api_client import api_client
        api_client.clear_token()
        self.app.navigate_to("/login")

    def get_container(self, current_route: str, content: ft.Control) -> ft.Row:
        """Wrap content with navigation sidebar."""
        return ft.Row(
            controls=[
                self.build(current_route),
                ft.VerticalDivider(width=1),
                ft.Container(
                    expand=True,
                    content=content,
                ),
            ],
            spacing=0,
        )
