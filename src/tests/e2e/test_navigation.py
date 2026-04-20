"""
E2E Tests for Navigation Sidebar - VAL-NAV-001 through VAL-NAV-006.

This module contains end-to-end tests for the OpenMarcus Navigation Sidebar component.
Tests cover all destinations (Home, History, Settings, Profile), active state indication,
leading avatar, and logout functionality.

These tests use component-level testing with Python mocks, following the same
pattern as test_home_page.py. This approach tests the Flet NavigationRail component
directly without requiring a browser/Playwright.
"""

from pathlib import Path
from unittest.mock import MagicMock
import flet as ft

# Import the navigation component for testing
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

from src.screens.navigation import NavigationSidebar
from src.services.api_client import api_client


class TestNavigationDestinations:
    """Tests for Navigation Sidebar destinations - VAL-NAV-001, VAL-NAV-002, VAL-NAV-003, VAL-NAV-004."""

    def test_val_nav_001_home_destination_active_state(self):
        """VAL-NAV-001: Home destination shows selected state when on /home."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for /home
        nav_rail = nav_sidebar.build("/home")

        # Home should be selected (index 0)
        assert nav_rail.selected_index == 0
        assert nav_rail.destinations[0].label == "Home"

    def test_val_nav_002_history_destination_active_state(self):
        """VAL-NAV-002: History destination shows selected state when on /history."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for /history
        nav_rail = nav_sidebar.build("/history")

        # History should be selected (index 1)
        assert nav_rail.selected_index == 1
        assert nav_rail.destinations[1].label == "History"

    def test_val_nav_003_settings_destination_active_state(self):
        """VAL-NAV-003: Settings destination shows selected state when on /settings."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for /settings
        nav_rail = nav_sidebar.build("/settings")

        # Settings should be selected (index 2)
        assert nav_rail.selected_index == 2
        assert nav_rail.destinations[2].label == "Settings"

    def test_val_nav_004_profile_destination_active_state(self):
        """VAL-NAV-004: Profile destination shows selected state when on /profile."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for /profile
        nav_rail = nav_sidebar.build("/profile")

        # Profile should be selected (index 3)
        assert nav_rail.selected_index == 3
        assert nav_rail.destinations[3].label == "Profile"


class TestNavigationLeadingAvatar:
    """Tests for Navigation Sidebar leading content - VAL-NAV-005."""

    def test_val_nav_005_leading_avatar_displayed(self):
        """VAL-NAV-005: Navigation sidebar shows CircleAvatar with 'M' logo."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Leading should have CircleAvatar with "M"
        leading = nav_rail.leading
        assert leading is not None

        # Leading content is a Container -> Column -> Container -> CircleAvatar
        column = leading.content
        assert isinstance(column, ft.Column)

        # First control is a Container with the avatar
        container = column.controls[0]
        assert isinstance(container, ft.Container)

        avatar = container.content
        assert isinstance(avatar, ft.CircleAvatar)

        # Avatar should have "M" content
        assert avatar.content.value == "M"
        assert avatar.bgcolor == ft.Colors.DEEP_PURPLE

    def test_leading_avatar_has_correct_size(self):
        """Leading CircleAvatar has correct size and styling."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Get the avatar
        leading = nav_rail.leading
        column = leading.content
        container = column.controls[0]
        avatar = container.content

        # Avatar should have white text, bold, size 24
        text_content = avatar.content
        assert text_content.size == 24
        assert text_content.color == ft.Colors.WHITE
        assert text_content.weight == ft.FontWeight.BOLD

        # Avatar should have purple background with radius 24
        assert avatar.bgcolor == ft.Colors.DEEP_PURPLE
        assert avatar.radius == 24


class TestNavigationLogoutButton:
    """Tests for Navigation Sidebar logout button - VAL-NAV-006."""

    def test_val_nav_006_logout_icon_displayed(self):
        """VAL-NAV-006: Navigation sidebar trailing area shows logout IconButton."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_sidebar.build("/home")

        # Trailing should have logout IconButton
        trailing = nav_sidebar.build("/home").trailing
        assert trailing is not None

        # Trailing content is a Column with IconButton at index 1
        column = trailing.content
        assert isinstance(column, ft.Column)

        # The logout button is at index 1 (after a Container(height=8))
        logout_button = column.controls[1]
        assert isinstance(logout_button, ft.IconButton)
        assert logout_button.icon == ft.Icons.LOGOUT
        assert logout_button.tooltip == "Logout"

    def test_logout_button_calls_handle_logout(self):
        """Logout IconButton has correct on_click handler."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Get logout button
        trailing = nav_rail.trailing
        column = trailing.content
        logout_button = column.controls[1]

        # Verify the button has an on_click handler
        assert logout_button.on_click is not None


class TestNavigationLogoutBehavior:
    """Tests for logout behavior - clearing token and navigating."""

    def test_logout_clears_token(self):
        """Clicking logout clears the API token."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Set a token
        api_client.token = "test_token_123"

        try:
            # Simulate logout click
            mock_event = MagicMock()
            nav_sidebar.handle_logout(mock_event)

            # Token should be cleared
            assert api_client.token is None
        finally:
            # Clean up
            api_client.token = None

    def test_logout_navigates_to_login(self):
        """Clicking logout navigates to /login."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate logout click
        mock_event = MagicMock()
        nav_sidebar.handle_logout(mock_event)

        # Should navigate to /login
        mock_app.navigate_to.assert_called_with("/login")

    def test_logout_clears_token_and_navigates(self):
        """Logout clears token and navigates in one action."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Set a token
        api_client.token = "test_token_456"

        try:
            # Simulate logout click
            mock_event = MagicMock()
            nav_sidebar.handle_logout(mock_event)

            # Token should be cleared
            assert api_client.token is None

            # Should navigate to /login
            mock_app.navigate_to.assert_called_with("/login")
        finally:
            # Clean up
            api_client.token = None


class TestNavigationDestinationsCount:
    """Tests for navigation destinations count and labels."""

    def test_has_four_destinations(self):
        """Navigation rail has exactly 4 destinations."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Should have exactly 4 destinations
        assert len(nav_rail.destinations) == 4

    def test_destination_labels_are_correct(self):
        """All destination labels are correct."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Labels should be: Home, History, Settings, Profile
        expected_labels = ["Home", "History", "Settings", "Profile"]
        actual_labels = [dest.label for dest in nav_rail.destinations]
        assert actual_labels == expected_labels

    def test_destination_icons_are_correct(self):
        """All destinations have correct icons (outline and selected)."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Check icons - Home should use HOME_OUTLINED and HOME
        assert nav_rail.destinations[0].icon == ft.Icons.HOME_OUTLINED
        assert nav_rail.destinations[0].selected_icon == ft.Icons.HOME

        # History should use HISTORY_OUTLINED and HISTORY
        assert nav_rail.destinations[1].icon == ft.Icons.HISTORY_OUTLINED
        assert nav_rail.destinations[1].selected_icon == ft.Icons.HISTORY

        # Settings should use SETTINGS_OUTLINED and SETTINGS
        assert nav_rail.destinations[2].icon == ft.Icons.SETTINGS_OUTLINED
        assert nav_rail.destinations[2].selected_icon == ft.Icons.SETTINGS

        # Profile should use PERSON_OUTLINED and PERSON
        assert nav_rail.destinations[3].icon == ft.Icons.PERSON_OUTLINED
        assert nav_rail.destinations[3].selected_icon == ft.Icons.PERSON


class TestNavigationOnChange:
    """Tests for navigation on_change handler."""

    def test_navigation_change_calls_navigate_to_home(self):
        """Selecting Home navigates to /home."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting index 0 (Home)
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = 0

        nav_sidebar.on_navigation_change(mock_event)

        mock_app.navigate_to.assert_called_with("/home")

    def test_navigation_change_calls_navigate_to_history(self):
        """Selecting History navigates to /history."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting index 1 (History)
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = 1

        nav_sidebar.on_navigation_change(mock_event)

        mock_app.navigate_to.assert_called_with("/history")

    def test_navigation_change_calls_navigate_to_settings(self):
        """Selecting Settings navigates to /settings."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting index 2 (Settings)
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = 2

        nav_sidebar.on_navigation_change(mock_event)

        mock_app.navigate_to.assert_called_with("/settings")

    def test_navigation_change_calls_navigate_to_profile(self):
        """Selecting Profile navigates to /profile."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting index 3 (Profile)
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = 3

        nav_sidebar.on_navigation_change(mock_event)

        mock_app.navigate_to.assert_called_with("/profile")


class TestNavigationRailProperties:
    """Tests for NavigationRail properties."""

    def test_navigation_rail_has_label_type_all(self):
        """NavigationRail uses label_type ALL for showing all labels."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Should show all labels
        assert nav_rail.label_type == ft.NavigationRailLabelType.ALL

    def test_navigation_rail_has_correct_min_width(self):
        """NavigationRail has correct minimum width."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Min width should be 100
        assert nav_rail.min_width == 100

    def test_navigation_rail_has_correct_extended_width(self):
        """NavigationRail has correct minimum extended width."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail
        nav_rail = nav_sidebar.build("/home")

        # Min extended width should be 200
        assert nav_rail.min_extended_width == 200


class TestNavigationEdgeCases:
    """Tests for navigation edge cases."""

    def test_unknown_route_defaults_to_home(self):
        """Unknown routes default to Home selection."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for unknown route
        nav_rail = nav_sidebar.build("/unknown")

        # Should default to Home (index 0)
        assert nav_rail.selected_index == 0

    def test_empty_route_defaults_to_home(self):
        """Empty routes default to Home selection."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Build navigation rail for empty route
        nav_rail = nav_sidebar.build("")

        # Should default to Home (index 0)
        assert nav_rail.selected_index == 0

    def test_invalid_index_ignored(self):
        """Invalid navigation selection indices are ignored."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting invalid index (e.g., 99)
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = 99

        # Should not crash and should not call navigate_to
        nav_sidebar.on_navigation_change(mock_event)

        # navigate_to should not have been called
        mock_app.navigate_to.assert_not_called()

    def test_negative_index_ignored(self):
        """Negative navigation selection indices are ignored."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Simulate selecting negative index
        mock_event = MagicMock()
        mock_event.control = MagicMock()
        mock_event.control.selected_index = -1

        # Should not crash and should not call navigate_to
        nav_sidebar.on_navigation_change(mock_event)

        # navigate_to should not have been called
        mock_app.navigate_to.assert_not_called()


class TestGetContainer:
    """Tests for get_container method."""

    def test_get_container_returns_row(self):
        """get_container returns a Row with nav, divider, and content."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Create some content
        content = ft.Text("Test Content")

        # Get container row
        row = nav_sidebar.get_container("/home", content)

        # Should be a Row
        assert isinstance(row, ft.Row)
        assert len(row.controls) == 3

        # First control should be NavigationRail
        assert isinstance(row.controls[0], ft.NavigationRail)

        # Second control should be VerticalDivider
        assert isinstance(row.controls[1], ft.VerticalDivider)

        # Third control should be Container with our content
        container = row.controls[2]
        assert isinstance(container, ft.Container)
        assert container.content == content

    def test_get_container_expands_content(self):
        """get_container sets expand=True on content container."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Create some content
        content = ft.Text("Test Content")

        # Get container row
        row = nav_sidebar.get_container("/home", content)

        # Content container should expand
        container = row.controls[2]
        assert container.expand is True

    def test_get_container_uses_spacing_zero(self):
        """get_container uses spacing=0 for tight layout."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        nav_sidebar = NavigationSidebar(mock_app)

        # Create some content
        content = ft.Text("Test Content")

        # Get container row
        row = nav_sidebar.get_container("/home", content)

        # Should have no spacing between controls
        assert row.spacing == 0
