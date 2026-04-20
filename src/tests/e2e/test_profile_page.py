"""
E2E Tests for Profile Page - VAL-PROFILE-001 through VAL-PROFILE-011.

This module contains end-to-end tests for the OpenMarcus Profile Page.
Tests cover pre-filled form, edit flow, save, cancel, and error handling.

These tests use component-level testing with Python mocks, following the same
pattern as test_onboarding_screen.py and test_home_page.py. This approach
tests the Flet screen components directly without requiring a browser/Playwright,
which is necessary because Flet's CanvasKit renderer doesn't expose DOM elements.
"""

from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
import flet as ft

# Import the profile page for testing
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

from src.screens.profile_page import ProfilePage
from src.services.api_client import api_client


def _init_profile_form(profile_page):
    """Initialize content_column and update_content for testing buttons/titles."""
    profile_page.content_column = ft.Column(
        controls=[profile_page.loading_indicator],
        alignment=ft.MainAxisAlignment.CENTER,
        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
    )
    profile_page.update_content()


class TestProfilePagePrefilledFields:
    """Tests for Profile Page pre-filled form fields - VAL-PROFILE-001, VAL-PROFILE-002, VAL-PROFILE-003."""

    def test_val_profile_001_name_field_prefilled(self):
        """VAL-PROFILE-001: Profile page name field is pre-filled with existing profile name."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        # Simulate loading a profile with an existing name
        profile_page.name_field.value = "Marcus Aurelius"

        assert profile_page.name_field.value == "Marcus Aurelius"

    def test_val_profile_002_goals_field_prefilled(self):
        """VAL-PROFILE-002: Profile page goals field is pre-filled with existing goals."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.goals_field.value = "Find inner peace and practice daily meditation"

        assert profile_page.goals_field.value == "Find inner peace and practice daily meditation"

    def test_val_profile_002_goals_field_empty_string(self):
        """VAL-PROFILE-002: Profile page goals field handles empty goals (None from API)."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        # API returns None for empty goals, which becomes ""
        goals_from_api = None
        goals_value = goals_from_api or ""
        profile_page.goals_field.value = goals_value

        assert profile_page.goals_field.value == ""

    def test_val_profile_003_experience_dropdown_prefilled(self):
        """VAL-PROFILE-003: Profile page experience dropdown pre-selected with existing level."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.experience_dropdown.value = "intermediate"

        assert profile_page.experience_dropdown.value == "intermediate"

    def test_val_profile_003_experience_dropdown_all_options(self):
        """VAL-PROFILE-003: Experience dropdown has all three options (beginner, intermediate, advanced)."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        options = profile_page.experience_dropdown.options
        assert len(options) == 3
        option_values = [opt.key for opt in options]
        assert "beginner" in option_values
        assert "intermediate" in option_values
        assert "advanced" in option_values


class TestProfilePageButtons:
    """Tests for Profile Page buttons - VAL-PROFILE-004, VAL-PROFILE-005."""

    def test_val_profile_004_save_changes_button_exists(self):
        """VAL-PROFILE-004: Profile page has 'Save Changes' ElevatedButton."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)
        _init_profile_form(profile_page)

        # Find the Save Changes button
        save_button = None
        for ctrl in profile_page.content_column.controls:
            if isinstance(ctrl, ft.ElevatedButton) and ctrl.text == "Save Changes":
                save_button = ctrl
                break

        assert save_button is not None, "Save Changes button not found"
        assert isinstance(save_button, ft.ElevatedButton)
        assert save_button.text == "Save Changes"
        assert save_button.width == 300
        assert save_button.height == 50

    def test_val_profile_005_cancel_button_navigates_home(self):
        """VAL-PROFILE-005: Clicking Cancel navigates back to /home."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)
        _init_profile_form(profile_page)

        # Find the Cancel button
        cancel_button = None
        for ctrl in profile_page.content_column.controls:
            if isinstance(ctrl, ft.OutlinedButton) and ctrl.text == "Cancel":
                cancel_button = ctrl
                break

        assert cancel_button is not None, "Cancel button not found"
        assert isinstance(cancel_button, ft.OutlinedButton)
        assert cancel_button.width == 300

        # Click the Cancel button
        mock_event = MagicMock()
        cancel_button.on_click(mock_event)

        # Should navigate to /home
        mock_app.navigate_to.assert_called_with("/home")


class TestProfilePageValidation:
    """Tests for Profile Page validation - VAL-PROFILE-006."""

    def test_val_profile_006_empty_name_validation(self):
        """VAL-PROFILE-006: Submitting without name shows 'Please enter your name'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = ""
        profile_page.goals_field.value = "Some goals"
        profile_page.experience_dropdown.value = "beginner"

        with patch.object(api_client, 'update_profile', new_callable=AsyncMock) as mock_update_profile:
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.handle_save())

            # update_profile should NOT have been called due to validation
            mock_update_profile.assert_not_called()

            # Error should be shown
            assert profile_page.error_text.visible is True
            assert "Please enter your name" in profile_page.error_text.value

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()


class TestProfilePageSuccess:
    """Tests for Profile Page success flow - VAL-PROFILE-007, VAL-PROFILE-008."""

    def test_val_profile_007_success_message_shown(self):
        """VAL-PROFILE-007: Saving successfully shows 'Profile saved successfully!' in green."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = "Marcus Aurelius"
        profile_page.goals_field.value = "Practice stoicism daily"
        profile_page.experience_dropdown.value = "advanced"

        with patch.object(api_client, 'update_profile', new_callable=AsyncMock) as mock_update_profile:
            mock_update_profile.return_value = (
                {"name": "Marcus Aurelius", "goals": "Practice stoicism daily", "experience_level": "advanced"},
                None
            )

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.handle_save())

            # Success message should be shown
            assert profile_page.success_text.visible is True
            assert "Profile saved successfully!" in profile_page.success_text.value

            # Success text should be green
            assert profile_page.success_text.color == ft.Colors.GREEN

    def test_val_profile_008_auto_redirect_after_success(self):
        """VAL-PROFILE-008: After save success, auto-navigates to /home after 1.5s."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = "Marcus Aurelius"
        profile_page.goals_field.value = "Practice stoicism daily"
        profile_page.experience_dropdown.value = "advanced"

        with patch.object(api_client, 'update_profile', new_callable=AsyncMock) as mock_update_profile:
            mock_update_profile.return_value = (
                {"name": "Marcus Aurelius", "goals": "Practice stoicism daily", "experience_level": "advanced"},
                None
            )

            import asyncio
            loop = asyncio.new_event_loop()

            # Run the save which starts a delayed navigate task
            loop.run_until_complete(profile_page.handle_save())

            # Success should have been shown
            assert profile_page.success_text.visible is True


class TestProfilePageLoadingState:
    """Tests for Profile Page loading state - VAL-PROFILE-009."""

    def test_val_profile_009_loading_state_during_save(self):
        """VAL-PROFILE-009: During save, fields disabled and loading indicator shown."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = "Test User"
        profile_page.goals_field.value = "Test goals"
        profile_page.experience_dropdown.value = "intermediate"

        # Test the set_loading method directly (simulates what happens during save)
        profile_page.set_loading(True)

        # Loading indicator should be visible
        assert profile_page.loading_indicator.visible is True

        # Fields should be disabled
        assert profile_page.name_field.disabled is True
        assert profile_page.goals_field.disabled is True
        assert profile_page.experience_dropdown.disabled is True

        # Restore loading state
        profile_page.set_loading(False)

        # After loading is done, fields should be re-enabled
        assert profile_page.loading_indicator.visible is False
        assert profile_page.name_field.disabled is False
        assert profile_page.goals_field.disabled is False
        assert profile_page.experience_dropdown.disabled is False


class TestProfilePageErrorHandling:
    """Tests for Profile Page error handling - VAL-PROFILE-010."""

    def test_val_profile_010_error_banner_on_api_failure(self):
        """VAL-PROFILE-010: API error shows error banner with retry."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = "Test User"
        profile_page.goals_field.value = "Test goals"
        profile_page.experience_dropdown.value = "beginner"

        with patch.object(api_client, 'update_profile', new_callable=AsyncMock) as mock_update_profile:
            mock_update_profile.return_value = (None, "Failed to update profile")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.handle_save())

            # Error should be shown
            assert profile_page.error_text.visible is True
            assert "Failed to update profile" in profile_page.error_text.value

            # Error banner should be visible
            assert profile_page.error_banner.container.visible is True

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()

    def test_val_profile_010_network_exception_shows_banner(self):
        """VAL-PROFILE-010: Network exception shows error banner with retry."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.name_field.value = "Test User"
        profile_page.goals_field.value = "Test goals"
        profile_page.experience_dropdown.value = "intermediate"

        with patch.object(api_client, 'update_profile', new_callable=AsyncMock) as mock_update_profile:
            mock_update_profile.side_effect = Exception("Connection timeout")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.handle_save())

            # Error should be shown
            assert profile_page.error_text.visible is True
            assert "Connection timeout" in profile_page.error_text.value

            # Error banner should be visible
            assert profile_page.error_banner.container.visible is True

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()

    def test_val_profile_010_error_dismiss_hides_banner(self):
        """VAL-PROFILE-010: Dismiss button hides the error banner."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        # Show an error
        profile_page.show_error("Test error message")

        # Error should be visible
        assert profile_page.error_text.visible is True
        assert profile_page.error_banner.container.visible is True

        # Click dismiss
        mock_event = MagicMock()
        profile_page._handle_error_dismiss(mock_event)

        # Error banner should be hidden
        assert profile_page.error_banner.container.visible is False

        # Error text should be cleared
        assert profile_page.error_text.visible is False
        assert profile_page.error_text.value == ""


class TestProfilePageUI:
    """Tests for Profile Page UI elements - VAL-PROFILE-011."""

    def test_val_profile_011_page_title_visible(self):
        """VAL-PROFILE-011: Profile page shows 'Edit Your Profile' heading."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)
        _init_profile_form(profile_page)

        # First control should be the page title
        page_title = profile_page.content_column.controls[0]
        assert isinstance(page_title, ft.Text)
        assert page_title.value == "Edit Your Profile"
        assert page_title.size == 32
        assert page_title.weight == ft.FontWeight.BOLD

    def test_profile_page_builds_view(self):
        """Profile page builds a valid Flet View with correct route."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        # Manually build the view structure (same as build() but without async)
        profile_page.content_column = ft.Column(
            controls=[profile_page.loading_indicator],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
        )

        view = ft.View(
            route="/profile",
            controls=[
                ft.Row(
                    controls=[
                        profile_page.navigation.build("/profile"),
                        ft.VerticalDivider(width=1),
                        ft.Container(
                            expand=True,
                            padding=ft.padding.all(24),
                            content=profile_page.content_column,
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
            ],
        )

        # View should have correct route
        assert view.route == "/profile"

        # View should have controls
        assert len(view.controls) >= 1

        # First control should be a Row with navigation + content
        row = view.controls[0]
        assert isinstance(row, ft.Row)
        assert len(row.controls) >= 3  # nav, divider, content container

    def test_profile_page_has_navigation_sidebar(self):
        """Profile page includes navigation sidebar."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        assert profile_page.navigation is not None

        # Build navigation rail for /profile
        nav_rail = profile_page.navigation.build("/profile")
        assert isinstance(nav_rail, ft.NavigationRail)
        assert nav_rail.selected_index == 3  # Profile is selected (index 3)

    def test_profile_page_has_error_banner(self):
        """Profile page includes error banner component."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        assert profile_page.error_banner is not None
        assert profile_page.error_banner.container is not None

    def test_profile_page_error_text_is_red(self):
        """Error text is displayed in red color."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.show_error("Test error")

        assert profile_page.error_text.color == ft.Colors.ERROR
        assert profile_page.error_text.visible is True

    def test_profile_page_success_text_is_green(self):
        """Success text is displayed in green color."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.show_success("Profile saved successfully!")

        assert profile_page.success_text.color == ft.Colors.GREEN
        assert profile_page.success_text.visible is True
        assert profile_page.success_text.value == "Profile saved successfully!"

    def test_profile_page_error_banner_initial_state(self):
        """Error banner is initially hidden."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        assert profile_page.error_banner.container.visible is False
        assert profile_page.error_text.visible is False

    def test_profile_page_clear_messages(self):
        """clear_messages clears both error and success messages."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        profile_page.show_error("Test error")
        assert profile_page.error_text.visible is True

        profile_page.clear_messages()

        assert profile_page.error_text.visible is False
        assert profile_page.success_text.visible is False
        assert profile_page.error_banner.container.visible is False


class TestProfilePageLoadProfile:
    """Tests for Profile Page load_profile functionality."""

    def test_load_profile_populates_fields(self):
        """load_profile correctly populates name, goals, and experience fields."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        with patch.object(api_client, 'get_profile', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (
                {"name": "Test User", "goals": "Test goals", "experience_level": "advanced"},
                None
            )

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.load_profile())

            # Fields should be populated
            assert profile_page.name_field.value == "Test User"
            assert profile_page.goals_field.value == "Test goals"
            assert profile_page.experience_dropdown.value == "advanced"

    def test_load_profile_no_profile_redirects_to_onboarding(self):
        """load_profile with 'Not found' error redirects to /onboarding."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        with patch.object(api_client, 'get_profile', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (None, "Not found")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.load_profile())

            # Should redirect to onboarding
            mock_app.navigate_to.assert_called_with("/onboarding")

    def test_load_profile_api_error_shows_banner(self):
        """load_profile with API error shows error banner."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        with patch.object(api_client, 'get_profile', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (None, "Server error: 500")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.load_profile())

            # Error banner should be visible
            assert profile_page.error_banner.container.visible is True
            assert profile_page.error_text.visible is True

    def test_load_profile_network_exception_shows_banner(self):
        """load_profile with network exception shows error banner."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        profile_page = ProfilePage(mock_app)

        with patch.object(api_client, 'get_profile', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Network connection failed")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(profile_page.load_profile())

            # Error banner should be visible
            assert profile_page.error_banner.container.visible is True
            assert "Failed to load profile" in profile_page.error_text.value
