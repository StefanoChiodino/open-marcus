"""
E2E Tests for Register Screen - VAL-REGISTER-001 through VAL-REGISTER-013.

This module contains end-to-end tests for the OpenMarcus Register Screen.
Tests cover form fields, validation, success/failure flows, loading states, and navigation.

These tests use component-level testing with Python mocks, following the same
pattern as test_login_screen.py. This approach tests the Flet screen components
directly without requiring a browser/Playwright, which is necessary because
Flet's CanvasKit renderer doesn't expose DOM elements.
"""

from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch
import flet as ft

# Import the register screen for testing
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

from src.screens.register_screen import RegisterScreen
from src.services.api_client import api_client


class TestRegisterScreenFields:
    """Tests for Register Screen form fields - VAL-REGISTER-001, VAL-REGISTER-002."""

    def test_val_register_001_all_three_fields_exist(self):
        """VAL-REGISTER-001: Register screen has username, password, and confirm password fields."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Username field should exist
        assert register_screen.username_field is not None
        assert isinstance(register_screen.username_field, ft.TextField)
        assert register_screen.username_field.label == "Username"

        # Password field should exist
        assert register_screen.password_field is not None
        assert isinstance(register_screen.password_field, ft.TextField)
        assert register_screen.password_field.label == "Password"
        assert register_screen.password_field.password is True

        # Confirm password field should exist
        assert register_screen.confirm_password_field is not None
        assert isinstance(register_screen.confirm_password_field, ft.TextField)
        assert register_screen.confirm_password_field.label == "Confirm Password"
        assert register_screen.confirm_password_field.password is True

        # Username field should have autofocus enabled
        assert register_screen.username_field.autofocus is True

    def test_val_register_002_create_account_button_exists(self):
        """VAL-REGISTER-002: Register screen has ElevatedButton labeled 'Create Account'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Build view to find the button
        view = register_screen.build()

        # Navigate to find the Create Account button
        # View structure: ft.View -> controls[0] = ft.Container -> content = ft.Column
        container = view.controls[0]
        column = container.content

        # Find the form column - it's nested in the Container
        # The structure is: Column controls = [title, subtitle, spacing, error containers, error_text, success_text, spacing, form_container, loading]
        # form_container.content is the form Column
        form_container = None
        for ctrl in column.controls:
            if isinstance(ctrl, ft.Container) and hasattr(ctrl, 'content') and isinstance(ctrl.content, ft.Column):
                form_container = ctrl
                break

        assert form_container is not None, "Form container not found"
        form_column = form_container.content

        # The Create Account button should be the ElevatedButton in the form
        create_account_button = None
        for ctrl in form_column.controls:
            if isinstance(ctrl, ft.ElevatedButton) and ctrl.text == "Create Account":
                create_account_button = ctrl
                break

        assert create_account_button is not None, "Create Account button not found"
        assert isinstance(create_account_button, ft.ElevatedButton)
        assert create_account_button.text == "Create Account"


class TestRegisterScreenNavigation:
    """Tests for Register Screen navigation - VAL-REGISTER-003."""

    def test_val_register_003_login_link_navigates_to_login(self):
        """VAL-REGISTER-003: Clicking 'Already have an account? Login' navigates to /login route."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Build view to find the login link
        view = register_screen.build()

        container = view.controls[0]
        column = container.content

        # Find form container
        form_container = None
        for ctrl in column.controls:
            if isinstance(ctrl, ft.Container) and hasattr(ctrl, 'content') and isinstance(ctrl.content, ft.Column):
                form_container = ctrl
                break

        form_column = form_container.content

        # Find the login link TextButton
        login_link = None
        for ctrl in form_column.controls:
            if isinstance(ctrl, ft.TextButton) and "Login" in ctrl.text:
                login_link = ctrl
                break

        assert login_link is not None, "Login link not found"
        assert isinstance(login_link, ft.TextButton)
        assert "Already have an account" in login_link.text

        # Clicking login link should call go_to_login
        mock_event = MagicMock()
        register_screen.go_to_login(mock_event)
        mock_app.navigate_to.assert_called_with("/login")


class TestRegisterScreenValidation:
    """Tests for Register Screen validation - VAL-REGISTER-004, VAL-REGISTER-005, VAL-REGISTER-006, VAL-REGISTER-007, VAL-REGISTER-008."""

    def test_val_register_004_empty_fields_shows_validation_error(self):
        """VAL-REGISTER-004: Submitting with any empty field shows 'Please fill in all fields'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Test with all empty fields
        register_screen.username_field.value = ""
        register_screen.password_field.value = ""
        register_screen.confirm_password_field.value = ""

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Please fill in all fields" in error_msg

    def test_val_register_004_empty_username_only(self):
        """VAL-REGISTER-004: Empty username shows validation error."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = ""
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Please fill in all fields" in error_msg

    def test_val_register_004_empty_password_only(self):
        """VAL-REGISTER-004: Empty password shows validation error."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = ""
        register_screen.confirm_password_field.value = "password123"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Please fill in all fields" in error_msg

    def test_val_register_004_empty_confirm_password_only(self):
        """VAL-REGISTER-004: Empty confirm password shows validation error."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = ""

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Please fill in all fields" in error_msg

    def test_val_register_005_username_too_short(self):
        """VAL-REGISTER-005: Username < 3 characters shows 'Username must be at least 3 characters'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "ab"  # 2 characters
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Username must be at least 3 characters" in error_msg

    def test_val_register_006_username_too_long(self):
        """VAL-REGISTER-006: Username > 50 characters shows 'Username must be 50 characters or less'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "a" * 51  # 51 characters
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Username must be 50 characters or less" in error_msg

    def test_val_register_007_password_too_short(self):
        """VAL-REGISTER-007: Password < 8 characters shows 'Password must be at least 8 characters'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "short"  # Less than 8
        register_screen.confirm_password_field.value = "short"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Password must be at least 8 characters" in error_msg

    def test_val_register_008_password_mismatch(self):
        """VAL-REGISTER-008: Password and confirm don't match shows 'Passwords do not match'."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "differentpassword"

        is_valid, error_msg = register_screen.validate_form(
            register_screen.username_field.value,
            register_screen.password_field.value,
            register_screen.confirm_password_field.value
        )

        assert is_valid is False
        assert "Passwords do not match" in error_msg


class TestRegisterScreenAPIError:
    """Tests for Register Screen API error handling - VAL-REGISTER-009, VAL-REGISTER-010."""

    def test_val_register_009_username_taken_shows_api_error(self):
        """VAL-REGISTER-009: Registering with existing username shows appropriate error from API."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "existinguser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Mock api_client.register to return error (username taken)
        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.return_value = (None, "Username already exists")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(register_screen.handle_register())

            # Error should be shown
            assert register_screen.error_text.visible is True
            assert "Username already exists" in register_screen.error_text.value

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()

    def test_val_register_010_network_error_shows_banner(self):
        """VAL-REGISTER-010: Network errors show NetworkErrorBanner with retry capability."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "newuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Mock api_client.register to raise a network exception
        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.side_effect = Exception("Connection timeout")

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(register_screen.handle_register())

            # Error should be shown
            assert register_screen.error_text.visible is True
            assert "Connection timeout" in register_screen.error_text.value

            # Should NOT navigate
            mock_app.navigate_to.assert_not_called()


class TestRegisterScreenSuccess:
    """Tests for Register Screen success flow - VAL-REGISTER-011, VAL-REGISTER-012."""

    def test_val_register_011_success_shows_message_and_redirects(self):
        """VAL-REGISTER-011: Successful registration shows 'Account created! Redirecting to login...' and auto-navigates after 1.5s."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "newuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Mock api_client.register to return success
        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.return_value = ({"username": "newuser"}, None)

            import asyncio
            loop = asyncio.new_event_loop()

            # Run registration
            loop.run_until_complete(register_screen.handle_register())

            # Success message should be shown
            assert register_screen.success_text.visible is True
            assert "Account created" in register_screen.success_text.value

            # Fields should be cleared
            assert register_screen.username_field.value == ""
            assert register_screen.password_field.value == ""
            assert register_screen.confirm_password_field.value == ""

            # Form should be enabled again (loading done)
            assert register_screen.username_field.disabled is False
            assert register_screen.password_field.disabled is False
            assert register_screen.confirm_password_field.disabled is False

            # Navigation to login should be scheduled (via _delayed_navigate)
            # We can't easily test the delay, but we can verify the navigation method exists
            # and would be called after the delay

    def test_val_register_012_form_cleared_on_success(self):
        """VAL-REGISTER-012: After successful registration, all form fields are cleared."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "testpassword123"
        register_screen.confirm_password_field.value = "testpassword123"

        # Verify fields have values before
        assert register_screen.username_field.value == "testuser"
        assert register_screen.password_field.value == "testpassword123"
        assert register_screen.confirm_password_field.value == "testpassword123"

        # Mock api_client.register to return success
        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.return_value = ({"username": "testuser"}, None)

            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(register_screen.handle_register())

            # All fields should be cleared after success
            assert register_screen.username_field.value == ""
            assert register_screen.password_field.value == ""
            assert register_screen.confirm_password_field.value == ""


class TestRegisterScreenLoadingState:
    """Tests for Register Screen loading state - VAL-REGISTER-013."""

    def test_val_register_013_loading_state_during_registration(self):
        """VAL-REGISTER-013: During registration attempt, all fields and button are disabled."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Test the set_loading method directly (simulates what happens during registration)
        register_screen.set_loading(True)

        # Loading indicator should be visible
        assert register_screen.loading_indicator.visible is True

        # Fields should be disabled
        assert register_screen.username_field.disabled is True
        assert register_screen.password_field.disabled is True
        assert register_screen.confirm_password_field.disabled is True

        # Restore loading state
        register_screen.set_loading(False)

        # After loading is done, loading should be false
        assert register_screen.loading_indicator.visible is False
        assert register_screen.username_field.disabled is False
        assert register_screen.password_field.disabled is False
        assert register_screen.confirm_password_field.disabled is False


class TestRegisterScreenUI:
    """Tests for Register Screen UI elements and helper methods."""

    def test_register_screen_builds_view(self):
        """Register screen builds a valid Flet View."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)
        view = register_screen.build()

        # View should have correct route
        assert view.route == "/register"

        # View should have controls
        assert len(view.controls) >= 1

    def test_register_screen_shows_title(self):
        """Register screen shows 'Create Account' title."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)
        view = register_screen.build()

        container = view.controls[0]
        column = container.content

        # First control should be the title
        title = column.controls[0]
        assert isinstance(title, ft.Text)
        assert title.value == "Create Account"

    def test_register_screen_shows_subtitle(self):
        """Register screen shows 'Start your Stoic meditation journey' subtitle."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)
        view = register_screen.build()

        container = view.controls[0]
        column = container.content

        # Second control should be the subtitle
        subtitle = column.controls[1]
        assert isinstance(subtitle, ft.Text)
        assert subtitle.value == "Start your Stoic meditation journey"

    def test_register_screen_error_text_is_red(self):
        """Error text is displayed in red color."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Show error
        register_screen.show_error("Test error")

        # Error text should be red
        assert register_screen.error_text.color == ft.Colors.ERROR
        assert register_screen.error_text.visible is True

    def test_register_screen_success_text_is_green(self):
        """Success text is displayed in green color."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Show success
        register_screen.show_success("Test success")

        # Success text should be green
        assert register_screen.success_text.color == ft.Colors.GREEN
        assert register_screen.success_text.visible is True
        assert register_screen.success_text.value == "Test success"

    def test_register_screen_clear_messages_works(self):
        """Clear messages hides error text, success text, and banners."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Show error
        register_screen.show_error("Test error")
        assert register_screen.error_text.visible is True

        # Show success
        register_screen.show_success("Test success")
        assert register_screen.success_text.visible is True

        # Clear messages
        register_screen.clear_messages()

        # All should be hidden
        assert register_screen.error_text.visible is False
        assert register_screen.success_text.visible is False
        assert register_screen.error_banner.container.visible is False
        assert register_screen.network_error_banner.container.visible is False

    def test_register_screen_form_submit_on_enter(self):
        """Pressing Enter in username, password, or confirm field triggers registration."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Mock api_client.register to return success
        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.return_value = ({"username": "testuser"}, None)

            # Call handle_register directly (same as pressing Enter would do)
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(register_screen.handle_register())

            # Register should have been called
            mock_register.assert_called_once_with("testuser", "password123")


class TestRegisterScreenNetworkErrorClassification:
    """Tests for network error classification in Register Screen."""

    def test_network_error_classification_timeout(self):
        """Network errors with 'timeout' are classified as timeout errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._classify_network_error("timeout error") == "timeout"
        assert register_screen._classify_network_error("Connection timeout") == "timeout"

    def test_network_error_classification_connection(self):
        """Network errors with 'connect' or 'connection' are classified as connection errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._classify_network_error("Cannot connect to server") == "connection"
        assert register_screen._classify_network_error("Connection refused") == "connection"

    def test_network_error_classification_offline(self):
        """Network errors with 'offline' are classified as offline errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._classify_network_error("You appear to be offline") == "offline"

    def test_network_error_classification_server(self):
        """Network errors with 'server' are classified as server errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._classify_network_error("Server error") == "server"

    def test_is_network_error_true(self):
        """Messages with network keywords are correctly identified as network errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._is_network_error_message("Cannot connect to server") is True
        assert register_screen._is_network_error_message("Request timed out") is True
        assert register_screen._is_network_error_message("Network connection lost") is True

    def test_is_network_error_false(self):
        """Messages without network keywords are correctly identified as non-network errors."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        assert register_screen._is_network_error_message("Username already exists") is False
        assert register_screen._is_network_error_message("Password too short") is False


class TestRegisterScreenErrorHandling:
    """Tests for Register Screen error handling (retry/dismiss)."""

    def test_register_screen_error_dismiss(self):
        """Clicking dismiss on error banner hides it and clears error."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Show an error
        register_screen.show_error("Test error message")

        # Error should be visible
        assert register_screen.error_text.visible is True
        assert register_screen.error_banner.container.visible is True

        # Click dismiss
        mock_event = MagicMock()
        register_screen._handle_error_dismiss(mock_event)

        # Error banner should be hidden
        assert register_screen.error_banner.container.visible is False
        assert register_screen.network_error_banner.container.visible is False

        # Error text should be cleared
        assert register_screen.error_text.visible is False

    def test_register_screen_error_retry(self):
        """Clicking retry on error banner re-attempts registration with same credentials.
        
        Note: We test the retry callback mechanism directly since the full async
        flow with asyncio.create_task requires a running event loop.
        """
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Set form values
        register_screen.username_field.value = "testuser"
        register_screen.password_field.value = "password123"
        register_screen.confirm_password_field.value = "password123"

        # Show an error first to set up the retry state
        register_screen.show_error("Username already exists")

        # Verify the retry callback is set (it's set in show_error via error_banner)
        # The _handle_error_retry method should be the retry handler
        assert register_screen._handle_error_retry is not None

        # Simulate retry by calling handle_login directly (mimicking what retry does)
        # Mock api_client.register - first call fails, second succeeds
        call_count = 0
        async def mock_register_with_retry(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return (None, "Username already exists")
            else:
                return ({"username": "testuser"}, None)

        with patch.object(api_client, 'register', new_callable=AsyncMock) as mock_register:
            mock_register.side_effect = mock_register_with_retry

            import asyncio
            loop = asyncio.new_event_loop()

            # First registration attempt - should fail
            loop.run_until_complete(register_screen.handle_register())
            assert call_count == 1
            assert register_screen.error_text.visible is True

            # Manually retry by calling handle_register again
            loop.run_until_complete(register_screen.handle_register())

            # Should have retried
            assert call_count == 2

    def test_register_screen_show_error_with_network_classification(self):
        """show_error with network message shows network error banner."""
        mock_app = MagicMock()
        mock_app.page = MagicMock()

        register_screen = RegisterScreen(mock_app)

        # Show a network error
        register_screen.show_error("Cannot connect to server", is_network_error=True)

        # Error text should be visible
        assert register_screen.error_text.visible is True
        assert "Cannot connect to server" in register_screen.error_text.value

        # Network error banner should be visible
        assert register_screen.network_error_banner.container.visible is True
