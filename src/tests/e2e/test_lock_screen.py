"""
E2E Tests for Lock Screen - VAL-LOCK-001 through VAL-LOCK-013.

This module contains end-to-end tests for the OpenMarcus Password Lock Screen.
Tests cover setup mode, unlock mode, validation, error handling, and navigation.

These tests use component-level testing with Python mocks, following the same
pattern as test_home_page.py and test_session_page.py. This approach tests
the Flet screen components directly without requiring a browser/Playwright,
which is necessary because Flet's CanvasKit renderer doesn't expose DOM elements.

Note: These tests require the password_lock_service and associated files in
/Users/stefano/repos/open-marcus/data to be accessible for password state checks.
"""

from pathlib import Path
from unittest.mock import MagicMock
import flet as ft

# Import the password lock service for test setup
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "src"))

from src.services.password_lock import password_lock_service


class TestLockScreenUnlockMode:
    """Tests for Lock Screen in unlock mode (password already set)."""
    
    def setup_method(self):
        """Set up test fixtures before each test."""
        # Clear any existing config to start fresh
        config_file = Path("/Users/stefano/repos/open-marcus/data/app_config.json")
        if config_file.exists():
            config_file.unlink()
        
        # Also clear the database files to ensure clean state
        db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db")
        enc_db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db.enc")
        if db_file.exists():
            db_file.unlink()
        if enc_db_file.exists():
            enc_db_file.unlink()
        
        # Set up password fresh
        password_lock_service.setup_new_password("testpassword123")
    
    def test_val_lock_001_empty_password_submission(self):
        """VAL-LOCK-001: Empty password submission shows error and does not navigate."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Set password field to empty
        lock_screen.password_field.value = ""
        
        # Handle unlock
        lock_screen.handle_unlock()
        
        # Error should be shown
        assert lock_screen.error_text.visible is True
        assert "Please enter your password" in lock_screen.error_text.value
        
        # Navigation should NOT have occurred
        mock_app.page.go.assert_not_called()
    
    def test_val_lock_002_wrong_password_shows_error(self):
        """VAL-LOCK-002: Wrong password shows 'Invalid password' error and does not navigate."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Set password field to wrong password
        lock_screen.password_field.value = "wrongpassword123"
        
        # Handle unlock
        lock_screen.handle_unlock()
        
        # Error should be shown
        assert lock_screen.error_text.visible is True
        assert "Invalid password" in lock_screen.error_text.value
        
        # Navigation should NOT have occurred
        mock_app.page.go.assert_not_called()
    
    def test_val_lock_003_correct_password_navigates_to_login(self):
        """VAL-LOCK-003: Correct password navigates to /login."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Set password field to correct password
        lock_screen.password_field.value = "testpassword123"
        
        # Handle unlock
        lock_screen.handle_unlock()
        
        # Success should be shown
        assert lock_screen.success_text.visible is True
        assert "Unlocked!" in lock_screen.success_text.value
        
        # Navigation to /login should have occurred
        mock_app.page.go.assert_called_with("/login")
    
    def test_val_lock_008_form_submits_on_enter_key(self):
        """VAL-LOCK-008: Pressing Enter in password field triggers form submission."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Set password field to wrong password
        lock_screen.password_field.value = "wrongpassword123"
        
        # Create a mock event with Enter key
        mock_event = MagicMock()
        
        # Call on_submit handler directly (simulates pressing Enter)
        lock_screen.password_field.on_submit(mock_event)
        
        # Error should be shown (form was submitted with wrong password)
        assert lock_screen.error_text.visible is True
        assert "Invalid password" in lock_screen.error_text.value
    
    def test_val_lock_011_status_text_unlock_mode(self):
        """VAL-LOCK-011: Unlock mode shows 'Enter your master password to unlock your data.'."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Build the view to initialize status_text
        lock_screen.build()
        
        # Status text should show unlock mode message
        assert lock_screen.status_text.value == "Enter your master password to unlock your data."
    
    def test_val_lock_012_success_text_shown_on_unlock(self):
        """VAL-LOCK-012: Unlocking successfully shows 'Unlocked! Loading your data...' in green text."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Set password field to correct password
        lock_screen.password_field.value = "testpassword123"
        
        # Handle unlock
        lock_screen.handle_unlock()
        
        # Success text should be visible and green
        assert lock_screen.success_text.visible is True
        assert "Unlocked! Loading your data..." in lock_screen.success_text.value
        assert lock_screen.success_text.color == ft.Colors.GREEN


class TestLockScreenSetupMode:
    """Tests for Lock Screen in setup mode (first launch, no password set)."""
    
    def setup_method(self):
        """Set up test fixtures before each test."""
        # Clear any existing password to force setup mode
        config_file = Path("/Users/stefano/repos/open-marcus/data/app_config.json")
        if config_file.exists():
            config_file.unlink()
        
        # Also clear the database files to ensure clean state
        db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db")
        enc_db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db.enc")
        if db_file.exists():
            db_file.unlink()
        if enc_db_file.exists():
            enc_db_file.unlink()
    
    def test_val_lock_004_setup_mode_on_first_launch(self):
        """VAL-LOCK-004: First launch shows setup mode with confirm password field and create button."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Build the view to initialize UI elements
        lock_screen.build()
        
        # For first launch, calling show_setup_mode() directly simulates what happens
        # when password_lock_service.is_password_set() returns False and user clicks Unlock
        lock_screen.show_setup_mode()
        
        # Should now be in setup mode
        assert lock_screen.password_field.label == "Create Master Password"
        assert lock_screen.confirm_password_field.visible is True
        assert lock_screen.setup_button.visible is True
        assert lock_screen.unlock_button.visible is False
    
    def test_val_lock_005_setup_password_too_short(self):
        """VAL-LOCK-005: Setting password shorter than 8 characters shows error."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Manually switch to setup mode (since no password set)
        lock_screen.password_field.label = "Create Master Password"
        lock_screen.confirm_password_field.visible = True
        lock_screen.unlock_button.visible = False
        lock_screen.setup_button.visible = True
        
        # Enter short password
        lock_screen.password_field.value = "short"
        lock_screen.confirm_password_field.value = "short"
        
        # Handle setup
        lock_screen.handle_setup()
        
        # Error should be shown
        assert lock_screen.error_text.visible is True
        assert "Password must be at least 8 characters" in lock_screen.error_text.value
    
    def test_val_lock_006_setup_password_mismatch(self):
        """VAL-LOCK-006: Password and confirmation that don't match shows error."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Manually switch to setup mode
        lock_screen.password_field.label = "Create Master Password"
        lock_screen.confirm_password_field.visible = True
        lock_screen.unlock_button.visible = False
        lock_screen.setup_button.visible = True
        
        # Enter password and different confirmation
        lock_screen.password_field.value = "password123"
        lock_screen.confirm_password_field.value = "different456"
        
        # Handle setup
        lock_screen.handle_setup()
        
        # Error should be shown
        assert lock_screen.error_text.visible is True
        assert "Passwords do not match" in lock_screen.error_text.value
    
    def test_val_lock_007_setup_success_navigates_to_login(self):
        """VAL-LOCK-007: Creating password successfully navigates to /login."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Manually switch to setup mode
        lock_screen.password_field.label = "Create Master Password"
        lock_screen.confirm_password_field.visible = True
        lock_screen.unlock_button.visible = False
        lock_screen.setup_button.visible = True
        
        # Enter valid password and matching confirmation
        lock_screen.password_field.value = "newpassword123"
        lock_screen.confirm_password_field.value = "newpassword123"
        
        # Handle setup
        lock_screen.handle_setup()
        
        # Success text should be visible
        assert lock_screen.success_text.visible is True
        assert "Password created!" in lock_screen.success_text.value
        
        # Navigation to /login should have occurred
        mock_app.page.go.assert_called_with("/login")
    
    def test_val_lock_011_status_text_setup_mode(self):
        """VAL-LOCK-011: Setup mode shows 'Create a master password to encrypt your data.'."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Switch to setup mode
        lock_screen.show_setup_mode()
        
        # Status text should show setup mode message
        assert lock_screen.status_text.value == "Create a master password to encrypt your data."
    
    def test_val_lock_013_success_text_shown_on_setup(self):
        """VAL-LOCK-013: Setting up password shows 'Password created! Loading your data...' in green."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # Manually switch to setup mode
        lock_screen.password_field.label = "Create Master Password"
        lock_screen.confirm_password_field.visible = True
        lock_screen.unlock_button.visible = False
        lock_screen.setup_button.visible = True
        
        # Enter valid password and matching confirmation
        lock_screen.password_field.value = "newpassword123"
        lock_screen.confirm_password_field.value = "newpassword123"
        
        # Handle setup
        lock_screen.handle_setup()
        
        # Success text should be visible and green
        assert lock_screen.success_text.visible is True
        assert "Password created! Loading your data..." in lock_screen.success_text.value
        assert lock_screen.success_text.color == ft.Colors.GREEN


class TestLockScreenErrorHandling:
    """Tests for Lock Screen error handling (VAL-LOCK-009 and VAL-LOCK-010).
    
    Note: VAL-LOCK-009 and VAL-LOCK-010 refer to "error banner retry" which implies
    network error handling. The lock screen performs only local password verification
    and does not have network operations. These tests verify retry behavior for
    local validation errors instead.
    """
    
    def setup_method(self):
        """Set up test fixtures before each test."""
        # Clear any existing password to start fresh
        # This ensures we have a known state for the singleton
        config_file = Path("/Users/stefano/repos/open-marcus/data/app_config.json")
        if config_file.exists():
            config_file.unlink()
        
        # Also clear the database files to ensure clean state
        db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db")
        enc_db_file = Path("/Users/stefano/repos/open-marcus/data/openMarcus.db.enc")
        if db_file.exists():
            db_file.unlink()
        if enc_db_file.exists():
            enc_db_file.unlink()
        
        # Now set up password fresh
        password_lock_service.setup_new_password("testpassword123")
    
    def test_val_lock_009_retry_re_attempts_operation(self):
        """VAL-LOCK-009: Retry (clicking Unlock again) re-attempts the operation."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # First attempt with wrong password - should show error
        lock_screen.password_field.value = "wrongpassword123"
        lock_screen.handle_unlock()
        assert lock_screen.error_text.visible is True
        assert "Invalid password" in lock_screen.error_text.value
        
        # Second attempt with correct password - should succeed
        lock_screen.password_field.value = "testpassword123"
        lock_screen.handle_unlock()
        
        # Success should be shown and navigation should occur
        assert lock_screen.success_text.visible is True
        mock_app.page.go.assert_called_with("/login")
    
    def test_val_lock_010_retry_after_empty_password(self):
        """VAL-LOCK-010: Retry after empty password error attempts the operation."""
        from src.screens.lock_screen import PasswordLockScreen
        
        # Create mock app
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        # Create lock screen
        lock_screen = PasswordLockScreen(mock_app)
        
        # First attempt with empty password - should show error
        lock_screen.password_field.value = ""
        lock_screen.handle_unlock()
        assert lock_screen.error_text.visible is True
        assert "Please enter your password" in lock_screen.error_text.value
        
        # Second attempt with correct password - should succeed
        lock_screen.password_field.value = "testpassword123"
        lock_screen.handle_unlock()
        
        # Success should be shown
        assert lock_screen.success_text.visible is True
        mock_app.page.go.assert_called_with("/login")


class TestLockScreenUI:
    """Tests for Lock Screen UI elements and behaviors."""
    
    def test_lock_icon_visible_in_view(self):
        """Lock screen shows the lock icon in the view."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        view = lock_screen.build()
        
        # View should have controls
        assert len(view.controls) >= 1
        
        # First control is outer Container
        outer_container = view.controls[0]
        assert isinstance(outer_container, ft.Container)
        
        # Outer container's content is the Column
        column = outer_container.content
        assert isinstance(column, ft.Column)
        
        # First control in column is the Icon
        icon = column.controls[0]
        assert isinstance(icon, ft.Icon)
        assert icon.name == ft.Icons.LOCK
    
    def test_app_title_visible(self):
        """Lock screen shows 'OpenMarcus' title."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        view = lock_screen.build()
        
        # Get the column from the container
        container = view.controls[0]
        column = container.content
        
        # Title should be second control (after icon and spacing)
        title = column.controls[2]
        assert isinstance(title, ft.Text)
        assert title.value == "OpenMarcus"
    
    def test_subtitle_visible(self):
        """Lock screen shows subtitle 'Your Stoic Meditation Companion'."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        view = lock_screen.build()
        
        container = view.controls[0]
        column = container.content
        
        subtitle = column.controls[3]
        assert isinstance(subtitle, ft.Text)
        assert subtitle.value == "Your Stoic Meditation Companion"
    
    def test_password_field_is_password_type(self):
        """Password field masks entered characters."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        
        # Password field should have password=True
        assert lock_screen.password_field.password is True
    
    def test_unlock_button_exists(self):
        """Unlock button exists and is visible in unlock mode."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        
        # Unlock button should be visible in unlock mode
        assert lock_screen.unlock_button.visible is True
        assert lock_screen.unlock_button.text == "Unlock"
    
    def test_error_text_is_red(self):
        """Error text is displayed in red color."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        
        # Show error
        lock_screen.show_error("Test error")
        
        # Error text should be red (ERROR color)
        assert lock_screen.error_text.color == ft.Colors.ERROR
        assert lock_screen.error_text.visible is True
    
    def test_success_text_is_green(self):
        """Success text is displayed in green color."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        
        # Show success
        lock_screen.show_success("Test success")
        
        # Success text should be green
        assert lock_screen.success_text.color == ft.Colors.GREEN
        assert lock_screen.success_text.visible is True


class TestLockScreenReset:
    """Tests for Lock Screen reset functionality."""
    
    def test_reset_restores_unlock_mode(self):
        """Reset restores the lock screen to unlock mode."""
        from src.screens.lock_screen import PasswordLockScreen
        
        mock_app = MagicMock()
        mock_app.page = MagicMock()
        
        lock_screen = PasswordLockScreen(mock_app)
        
        # Manually switch to setup mode
        lock_screen.password_field.label = "Create Master Password"
        lock_screen.confirm_password_field.visible = True
        lock_screen.unlock_button.visible = False
        lock_screen.setup_button.visible = True
        
        # Reset
        lock_screen.reset()
        
        # Should be back in unlock mode
        assert lock_screen.password_field.label == "Master Password"
        assert lock_screen.confirm_password_field.visible is False
        assert lock_screen.unlock_button.visible is True
        assert lock_screen.setup_button.visible is False
        assert lock_screen.status_text.value == "Enter your master password to unlock your data."
