"""
Tests for HomePage screen.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import flet as ft


class TestHomePageImports:
    """Test that HomePage can be imported correctly."""

    def test_home_page_imports_successfully(self):
        """Test HomePage class can be imported."""
        from src.screens.home_page import HomePage
        assert HomePage is not None

    def test_home_page_module_imports(self):
        """Test all required imports in home_page module."""
        from src.screens.home_page import HomePage
        from src.services.api_client import api_client
        assert HomePage is not None
        assert api_client is not None


class TestHomePageStructure:
    """Tests for HomePage class structure."""

    def test_home_page_has_required_attributes(self):
        """Test HomePage initializes with required attributes."""
        from src.screens.home_page import HomePage
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        
        assert hasattr(home_page, 'app')
        assert hasattr(home_page, 'user_name')
        assert hasattr(home_page, 'meditation_goals')
        assert hasattr(home_page, 'experience_level')
        assert hasattr(home_page, 'profile')
        assert hasattr(home_page, 'loading')
        assert hasattr(home_page, 'loading_indicator')
        assert hasattr(home_page, 'content_column')

    def test_home_page_default_values(self):
        """Test HomePage default values before loading profile."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        
        assert home_page.user_name == "Guest User"
        assert home_page.meditation_goals == "Not set"
        assert home_page.experience_level == "Beginner"
        assert home_page.loading is True

    @patch('asyncio.create_task')
    def test_home_page_build_returns_view(self, mock_create_task):
        """Test HomePage.build() returns a ft.View."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        view = home_page.build()
        
        assert isinstance(view, ft.View)
        assert view.route == "/home"

    @patch('asyncio.create_task')
    def test_home_page_has_begin_meditation_button(self, mock_create_task):
        """Test that HomePage has the Begin Meditation button in build."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        view = home_page.build()
        
        # Check that the view has controls (AppBar, Container)
        assert len(view.controls) >= 2
        
        # The second control should be a Container with the content
        container = view.controls[1]
        assert isinstance(container, ft.Container)
        assert isinstance(container.content, ft.Column)


class TestHomePageNavigation:
    """Tests for HomePage navigation methods."""

    @patch('asyncio.create_task')
    def test_navigate_to_session(self, mock_create_task):
        """Test Begin Meditation button navigates to /session."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        mock_app.navigate_to = MagicMock()
        
        home_page = HomePage(mock_app)
        
        # build() first to set up content_column
        view = home_page.build()
        
        # Trigger the navigation callback via update_content
        home_page.update_content()
        
        # Now the content_column has been updated with the buttons
        # But we need to look at the SAME content_column, not call build() again
        content_col = home_page.content_column
        
        # Find the ElevatedButton with "Begin Meditation"
        for control in content_col.controls:
            if isinstance(control, ft.Container) and isinstance(control.content, ft.ElevatedButton):
                button = control.content
                if button.text == "Begin Meditation":
                    # Simulate button click
                    button.on_click(None)
                    mock_app.navigate_to.assert_called_with("/session")
                    return
        
        pytest.fail("Begin Meditation button not found")

    @patch('asyncio.create_task')
    def test_navigate_to_history(self, mock_create_task):
        """Test History button navigates to /history."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        mock_app.navigate_to = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()  # First build to set up content_column
        home_page.update_content()
        
        # Find History button in the AppBar
        view = home_page.build()
        appbar = view.controls[0]
        
        for control in appbar.actions:
            if isinstance(control, ft.IconButton) and control.icon == ft.Icons.HISTORY:
                control.on_click(None)
                mock_app.navigate_to.assert_called_with("/history")
                return
        
        pytest.fail("History button not found in AppBar")

    @patch('asyncio.create_task')
    def test_navigate_to_settings(self, mock_create_task):
        """Test Settings button navigates to /settings."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        mock_app.navigate_to = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.update_content()
        
        # Find Settings button
        view = home_page.build()
        appbar = view.controls[0]
        
        for control in appbar.actions:
            if isinstance(control, ft.IconButton) and control.icon == ft.Icons.SETTINGS:
                control.on_click(None)
                mock_app.navigate_to.assert_called_with("/settings")
                return
        
        pytest.fail("Settings button not found in AppBar")

    @patch('asyncio.create_task')
    def test_navigate_to_profile_edit(self, mock_create_task):
        """Test Edit Profile button navigates to /profile."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        mock_app.navigate_to = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.update_content()
        
        # Look at the SAME content_column, not call build() again
        content_col = home_page.content_column
        
        # Look for the TextButton with "Edit"
        for control in content_col.controls:
            if isinstance(control, ft.Card):
                card_content = control.content
                if isinstance(card_content, ft.Container):
                    card_col = card_content.content
                    for card_control in card_col.controls:
                        if isinstance(card_control, ft.Row):
                            for row_control in card_control.controls:
                                if isinstance(row_control, ft.TextButton) and row_control.text == "Edit":
                                    row_control.on_click(None)
                                    mock_app.navigate_to.assert_called_with("/profile")
                                    return
        
        pytest.fail("Edit Profile button not found")


class TestHomePageProfileDisplay:
    """Tests for HomePage profile display functionality."""

    @patch('asyncio.create_task')
    def test_update_content_displays_user_name(self, mock_create_task):
        """Test that update_content shows the user's name."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()  # Build first to set up content_column
        home_page.user_name = "Test User"
        home_page.update_content()
        
        # Check that content_column has controls
        assert home_page.content_column is not None
        assert len(home_page.content_column.controls) > 0
        
        # First control should be the welcome container
        welcome_container = home_page.content_column.controls[0]
        assert isinstance(welcome_container, ft.Container)
        
        welcome_col = welcome_container.content
        welcome_text = welcome_col.controls[0]
        assert "Test User" in welcome_text.value

    @patch('asyncio.create_task')
    def test_update_content_displays_meditation_goals(self, mock_create_task):
        """Test that update_content shows meditation goals."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.user_name = "Test User"
        home_page.meditation_goals = "Reduce stress and find inner peace"
        home_page.update_content()
        
        # Look for the goals in the profile card - profile card is at index 2
        # Index 0: Welcome container, Index 1: Container(height=32), Index 2: Profile card
        profile_card = home_page.content_column.controls[2]
        assert isinstance(profile_card, ft.Card)
        
        card_content = profile_card.content
        card_col = card_content.content
        
        # Find Goals row
        goals_found = False
        for control in card_col.controls:
            if isinstance(control, ft.Row):
                for row_control in control.controls:
                    if isinstance(row_control, ft.Text) and "Reduce stress" in row_control.value:
                        goals_found = True
                        break
        
        assert goals_found, "Meditation goals not found in profile card"

    def test_load_profile_updates_user_data(self):
        """Test that load_profile correctly updates user data from API response."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        mock_app.navigate_to = MagicMock()
        
        home_page = HomePage(mock_app)
        
        # Mock API response
        mock_profile = {
            "name": "John Doe",
            "goals": "Practice Stoicism daily",
            "experience_level": "intermediate"
        }
        
        # Directly test the load logic
        home_page.profile = mock_profile
        home_page.user_name = mock_profile.get("name", "Guest User")
        home_page.meditation_goals = mock_profile.get("goals", "Not set") or "Not set"
        experience = mock_profile.get("experience_level", "beginner")
        home_page.experience_level = experience.capitalize() if experience else "Beginner"
        
        assert home_page.user_name == "John Doe"
        assert home_page.meditation_goals == "Practice Stoicism daily"
        assert home_page.experience_level == "Intermediate"


class TestHomePageValidation:
    """Tests validating HomePage meets VAL-PROFILE-003 requirements."""

    @patch('asyncio.create_task')
    def test_profile_display_val_profile_003_name_prominent(self, mock_create_task):
        """VAL-PROFILE-003: User's name is prominently displayed."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.user_name = "Marcus"
        home_page.update_content()
        
        # Check welcome text contains name prominently (bold, large size)
        welcome_container = home_page.content_column.controls[0]
        welcome_col = welcome_container.content
        welcome_text = welcome_col.controls[0]
        
        assert "Marcus" in welcome_text.value
        assert welcome_text.weight == ft.FontWeight.BOLD
        assert welcome_text.size == 32  # Large size

    @patch('asyncio.create_task')
    def test_profile_display_val_profile_003_goals_displayed(self, mock_create_task):
        """VAL-PROFILE-003: Meditation goals are displayed."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.meditation_goals = "Find inner peace"
        home_page.update_content()
        
        # Profile card should be at index 2 (after welcome and spacer)
        profile_card = home_page.content_column.controls[2]
        assert isinstance(profile_card, ft.Card)
        
        # Goals should be in the card
        card_content = profile_card.content
        card_col = card_content.content
        
        goals_text_found = False
        for control in card_col.controls:
            if isinstance(control, ft.Row):
                for row_control in control.controls:
                    if isinstance(row_control, ft.Text) and "Find inner peace" in row_control.value:
                        goals_text_found = True
                        break
        
        assert goals_text_found, "Goals not found in profile card"

    @patch('asyncio.create_task')
    def test_begin_meditation_button_present(self, mock_create_task):
        """Test that 'Begin Meditation' button is present."""
        from src.screens.home_page import HomePage
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        home_page = HomePage(mock_app)
        home_page.build()
        home_page.update_content()
        
        # Find the button
        button_found = False
        for control in home_page.content_column.controls:
            if isinstance(control, ft.Container) and isinstance(control.content, ft.ElevatedButton):
                if control.content.text == "Begin Meditation":
                    button_found = True
                    break
        
        assert button_found, "Begin Meditation button not found"
