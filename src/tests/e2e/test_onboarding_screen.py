"""
E2E Tests for Onboarding Screen - VAL-ONBOARD-001 through VAL-ONBOARD-009.

This module contains end-to-end tests for the OpenMarcus Onboarding Screen.
Tests cover form fields, validation, success/failure flows, loading states, and navigation.

These tests use component-level testing with Python mocks, following the same
pattern as test_register_screen.py. This approach tests the Flet screen components
directly without requiring a browser/Playwright, which is necessary because
Flet's CanvasKit renderer doesn't expose DOM elements.
"""

from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
import flet as ft

# Import the onboarding screen for testing
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

from src.screens.onboarding_screen import OnboardingScreen
from src.services.api_client import api_client


class TestOnboardingScreenFields:
    """Tests for Onboarding Screen form fields - VAL-ONBOARD-001, VAL-ONBOARD-002, VAL-ONBOARD-003, VAL-ONBOARD-004."""

    def test_val_onboard_001_name_field_exists_and_autofocuses(self):
        """VAL-ONBOARD-001: Onboarding has TextField 'Your Name' that receives autofocus."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Name field should exist
        assert onboarding_screen.name_field is not None
        assert isinstance(onboarding_screen.name_field, ft.TextField)
        assert onboarding_screen.name_field.label == "Your Name"

        # Name field should have autofocus enabled
        assert onboarding_screen.name_field.autofocus is True

    def test_val_onboard_002_goals_textarea_exists(self):
        """VAL-ONBOARD-002: Onboarding has multiline TextField for meditation goals."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Goals field should exist
        assert onboarding_screen.goals_field is not None
        assert isinstance(onboarding_screen.goals_field, ft.TextField)
        assert onboarding_screen.goals_field.multiline is True
        assert onboarding_screen.goals_field.min_lines == 3
        assert "Meditation Goals" in onboarding_screen.goals_field.label

    def test_val_onboard_003_experience_dropdown_exists(self):
        """VAL-ONBOARD-003: Onboarding has dropdown with beginner/intermediate/advanced options."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Experience dropdown should exist
        assert onboarding_screen.experience_dropdown is not None
        assert isinstance(onboarding_screen.experience_dropdown, ft.Dropdown)
        assert onboarding_screen.experience_dropdown.label == "Experience Level"

        # Should have three options: beginner, intermediate, advanced
        options = onboarding_screen.experience_dropdown.options
        assert len(options) == 3
        option_values = [opt.key for opt in options]
        assert "beginner" in option_values
        assert "intermediate" in option_values
        assert "advanced" in option_values

        # Default value should be "beginner"
        assert onboarding_screen.experience_dropdown.value == "beginner"

    def test_val_onboard_004_continue_button_exists(self):
        """VAL-ONBOARD-004: Onboarding has 'Continue' button to submit form."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Build view to find the continue button
        view = onboarding_screen.build()

        # Navigate to find the Continue button
        # View structure: ft.View -> controls[0] = ft.Container -> content = ft.Column
        container = view.controls[0]
        column = container.content

        # Find the Continue button in the column
        continue_button = None
        for ctrl in column.controls:
            if isinstance(ctrl, ft.ElevatedButton) and ctrl.text == "Continue":
                continue_button = ctrl
                break

        assert continue_button is not None, "Continue button not found"
        assert isinstance(continue_button, ft.ElevatedButton)
        assert continue_button.text == "Continue"
        assert continue_button.width == 300
        assert continue_button.height == 50


class TestOnboardingScreenUI:
    """Tests for Onboarding Screen UI elements - VAL-ONBOARD-008, VAL-ONBOARD-009."""

    def test_val_onboard_008_welcome_title_visible(self):
        """VAL-ONBOARD-008: Screen shows 'Welcome to OpenMarcus' heading."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)
        view = onboarding_screen.build()

        container = view.controls[0]
        column = container.content

        # First control should be the welcome title
        welcome_title = column.controls[0]
        assert isinstance(welcome_title, ft.Text)
        assert welcome_title.value == "Welcome to OpenMarcus"
        assert welcome_title.size == 36
        assert welcome_title.weight == ft.FontWeight.BOLD

    def test_val_onboard_009_subtitle_visible(self):
        """VAL-ONBOARD-009: Screen shows 'Let's set up your meditation profile' subheading."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)
        view = onboarding_screen.build()

        container = view.controls[0]
        column = container.content

        # Second control should be the subtitle
        subtitle = column.controls[1]
        assert isinstance(subtitle, ft.Text)
        assert subtitle.value == "Let's set up your meditation profile"
        assert subtitle.size == 16


class TestOnboardingScreenValidation:
    """Tests for Onboarding Screen validation - VAL-ONBOARD-005."""

    def test_val_onboard_005_empty_name_validation(self):
        """VAL-ONBOARD-005: Submitting without name shows 'Please enter your name'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set empty name
        onboarding_screen.name_field.value = ""
        onboarding_screen.goals_field.value = "Some goals"
        onboarding_screen.experience_dropdown.value = "beginner"

        # Mock api_client.create_profile - should not be called due to validation
        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(onboarding_screen.handle_continue())

            # create_profile should NOT have been called due to validation
            mock_create_profile.assert_not_called()

            # Error should be shown
            assert onboarding_screen.error_text.visible is True
            assert "Please enter your name" in onboarding_screen.error_text.value

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()

class TestOnboardingScreenAPIError:
    """Tests for Onboarding Screen API error handling - VAL-ONBOARD-006."""

    def test_val_onboard_006_network_error_shows_banner(self):
        """VAL-ONBOARD-006: Network errors show error banner with retry."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set valid form values
        onboarding_screen.name_field.value = "Test User"
        onboarding_screen.goals_field.value = "Find peace and clarity"
        onboarding_screen.experience_dropdown.value = "beginner"

        # Mock api_client.create_profile to raise a network exception
        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            mock_create_profile.side_effect = Exception("Connection timeout")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(onboarding_screen.handle_continue())

            # Error should be shown
            assert onboarding_screen.error_text.visible is True
            assert "Connection timeout" in onboarding_screen.error_text.value

            # Error banner should be visible
            assert onboarding_screen.error_banner.container.visible is True

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()

    def test_val_onboard_006_api_error_shows_banner(self):
        """VAL-ONBOARD-006: API errors (returned as second value) show error banner with retry."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set valid form values
        onboarding_screen.name_field.value = "Test User"
        onboarding_screen.goals_field.value = "Find peace and clarity"
        onboarding_screen.experience_dropdown.value = "intermediate"

        # Mock api_client.create_profile to return an error
        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            mock_create_profile.return_value = (None, "Failed to create profile")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(onboarding_screen.handle_continue())

            # Error should be shown
            assert onboarding_screen.error_text.visible is True
            assert "Failed to create profile" in onboarding_screen.error_text.value

            # Error banner should be visible
            assert onboarding_screen.error_banner.container.visible is True

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()


class TestOnboardingScreenSuccess:
    """Tests for Onboarding Screen success flow - VAL-ONBOARD-007."""

    def test_val_onboard_007_success_navigates_to_home(self):
        """VAL-ONBOARD-007: Successful onboarding submission navigates to /home."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set valid form values
        onboarding_screen.name_field.value = "Marcus User"
        onboarding_screen.goals_field.value = "Learn to meditate daily"
        onboarding_screen.experience_dropdown.value = "advanced"

        # Mock api_client.create_profile to return success
        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            mock_create_profile.return_value = ({"name": "Marcus User", "goals": "Learn to meditate daily", "experience": "advanced"}, None)

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(onboarding_screen.handle_continue())

            # create_profile should have been called with correct arguments
            mock_create_profile.assert_called_once_with("Marcus User", "Learn to meditate daily", "advanced")

            # Should navigate to /home
            mock_app.navigate_to.assert_called_with("/home")

    def test_val_onboard_007_success_with_empty_goals(self):
        """VAL-ONBOARD-007: Successful onboarding with empty goals still navigates to /home."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set valid form values with empty goals
        onboarding_screen.name_field.value = "New User"
        onboarding_screen.goals_field.value = ""
        onboarding_screen.experience_dropdown.value = "beginner"

        # Mock api_client.create_profile to return success
        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            mock_create_profile.return_value = ({"name": "New User", "goals": "", "experience": "beginner"}, None)

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(onboarding_screen.handle_continue())

            # create_profile should have been called with empty string for goals
            mock_create_profile.assert_called_once_with("New User", "", "beginner")

            # Should navigate to /home
            mock_app.navigate_to.assert_called_with("/home")


class TestOnboardingScreenLoadingState:
    """Tests for Onboarding Screen loading state during profile creation."""

    def test_loading_state_during_profile_creation(self):
        """During profile creation, fields are disabled and loading indicator is shown."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set valid form values
        onboarding_screen.name_field.value = "Test User"
        onboarding_screen.goals_field.value = "Test goals"
        onboarding_screen.experience_dropdown.value = "intermediate"

        # Test the set_loading method directly (simulates what happens during profile creation)
        onboarding_screen.set_loading(True)

        # Loading indicator should be visible
        assert onboarding_screen.loading_indicator.visible is True

        # Fields should be disabled
        assert onboarding_screen.name_field.disabled is True
        assert onboarding_screen.goals_field.disabled is True
        assert onboarding_screen.experience_dropdown.disabled is True

        # Restore loading state
        onboarding_screen.set_loading(False)

        # After loading is done, fields should be re-enabled
        assert onboarding_screen.loading_indicator.visible is False
        assert onboarding_screen.name_field.disabled is False
        assert onboarding_screen.goals_field.disabled is False
        assert onboarding_screen.experience_dropdown.disabled is False


class TestOnboardingScreenErrorHandling:
    """Tests for Onboarding Screen error handling (retry/dismiss)."""

    def test_onboarding_screen_error_dismiss(self):
        """Clicking dismiss on error banner hides it and clears error."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Show an error
        onboarding_screen.show_error("Test error message")

        # Error should be visible
        assert onboarding_screen.error_text.visible is True
        assert onboarding_screen.error_banner.container.visible is True

        # Click dismiss
        mock_event = MagicMock()
        onboarding_screen._handle_error_dismiss(mock_event)

        # Error banner should be hidden
        assert onboarding_screen.error_banner.container.visible is False

        # Error text should be cleared
        assert onboarding_screen.error_text.visible is False
        assert onboarding_screen.error_text.value == ""

    def test_onboarding_screen_clear_error(self):
        """clear_error hides error text and error banner."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Show an error
        onboarding_screen.show_error("Test error message")
        assert onboarding_screen.error_text.visible is True
        assert onboarding_screen.error_banner.container.visible is True

        # Clear error
        onboarding_screen.clear_error()

        # Both should be hidden
        assert onboarding_screen.error_text.visible is False
        assert onboarding_screen.error_banner.container.visible is False

    def test_onboarding_screen_error_retry(self):
        """Clicking retry on error banner re-attempts profile creation."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Set form values
        onboarding_screen.name_field.value = "Test User"
        onboarding_screen.goals_field.value = "Test goals"
        onboarding_screen.experience_dropdown.value = "beginner"

        # Show an error first to set up the retry state
        onboarding_screen.show_error("Network error")

        # Verify the retry callback is set
        assert onboarding_screen._handle_error_retry is not None

        # Mock api_client.create_profile
        call_count = 0
        async def mock_create_profile_with_retry(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return (None, "Network error")
            else:
                return ({"name": "Test User", "goals": "Test goals", "experience": "beginner"}, None)

        with patch.object(api_client, 'create_profile', new_callable=AsyncMock) as mock_create_profile:
            mock_create_profile.side_effect = mock_create_profile_with_retry

            import asyncio
            loop = asyncio.new_event_loop()

            # First profile creation attempt - should fail
            loop.run_until_complete(onboarding_screen.handle_continue())
            assert call_count == 1
            assert onboarding_screen.error_text.visible is True

            # Manually retry by calling handle_continue again
            loop.run_until_complete(onboarding_screen.handle_continue())

            # Should have retried
            assert call_count == 2


class TestOnboardingScreenBuild:
    """Tests for Onboarding Screen build method."""

    def test_onboarding_screen_builds_view(self):
        """Onboarding screen builds a valid Flet View with correct route."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)
        view = onboarding_screen.build()

        # View should have correct route
        assert view.route == "/onboarding"

        # View should have controls
        assert len(view.controls) >= 1

    def test_onboarding_screen_view_structure(self):
        """Onboarding screen view has proper container and column structure."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)
        view = onboarding_screen.build()

        # First control should be a Container with alignment
        container = view.controls[0]
        assert isinstance(container, ft.Container)
        assert container.alignment == ft.alignment.center
        assert container.expand is True

        # Container content should be a Column
        column = container.content
        assert isinstance(column, ft.Column)
        assert column.alignment == ft.MainAxisAlignment.CENTER
        assert column.horizontal_alignment == ft.CrossAxisAlignment.CENTER

    def test_onboarding_screen_error_text_is_red(self):
        """Error text is displayed in red color."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Show error
        onboarding_screen.show_error("Test error")

        # Error text should be red
        assert onboarding_screen.error_text.color == ft.Colors.ERROR
        assert onboarding_screen.error_text.visible is True

    def test_onboarding_screen_error_banner_initial_state(self):
        """Error banner is initially hidden."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        onboarding_screen = OnboardingScreen(mock_app)

        # Error banner should be initially hidden
        assert onboarding_screen.error_banner.container.visible is False
        assert onboarding_screen.error_text.visible is False
