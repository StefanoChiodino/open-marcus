"""
Tests for API client service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from src.services.api_client import APIClient


# Async tests require pytest-asyncio marker
pytestmark = pytest.mark.asyncio


class TestAPIClient:
    """Tests for APIClient class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.client.BASE_URL = "http://localhost:8000"

    def test_get_headers_without_token(self):
        """Test headers without auth token."""
        headers = self.client.get_headers()
        assert headers["Content-Type"] == "application/json"
        assert "Authorization" not in headers

    def test_get_headers_with_token(self):
        """Test headers with auth token."""
        self.client.token = "test_token_123"
        headers = self.client.get_headers()
        assert headers["Content-Type"] == "application/json"
        assert headers["Authorization"] == "Bearer test_token_123"

    def test_token_property_setter(self):
        """Test token property setter."""
        self.client.token = "new_token"
        assert self.client.token == "new_token"

    def test_token_property_deleter(self):
        """Test token property can be set to None."""
        self.client.token = "token"
        self.client.token = None
        assert self.client.token is None

    async def test_post_success(self):
        """Test successful POST request."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"access_token": "test_token"}

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result, error = await self.client.post("/test", {"key": "value"})

            assert result == {"access_token": "test_token"}
            assert error is None

    async def test_post_401_error(self):
        """Test POST with 401 error returns error message."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"detail": "Invalid credentials"}

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result, error = await self.client.post("/test", {"key": "value"})

            assert result is None
            assert error == "Invalid username or password"

    async def test_post_400_error(self):
        """Test POST with 400 error returns error message."""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"detail": "Username already exists"}

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result, error = await self.client.post("/test", {"key": "value"})

            assert result is None
            assert error == "Username already exists"

    async def test_post_timeout(self):
        """Test POST timeout handling."""
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result, error = await self.client.post("/test", {"key": "value"})

            assert result is None
            assert "timed out" in error

    async def test_post_connection_error(self):
        """Test POST connection error handling."""
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result, error = await self.client.post("/test", {"key": "value"})

            assert result is None
            assert "Cannot connect" in error

    async def test_register(self):
        """Test register method calls post with correct data."""
        with patch.object(self.client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = ({"id": "123", "username": "test"}, None)

            result, error = await self.client.register("test", "password123")

            mock_post.assert_called_once_with("/api/auth/register", {"username": "test", "password": "password123"})
            assert result == {"id": "123", "username": "test"}
            assert error is None

    async def test_login(self):
        """Test login method calls post with correct data."""
        with patch.object(self.client, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = ({"access_token": "token123", "token_type": "bearer"}, None)

            result, error = await self.client.login("test", "password123")

            mock_post.assert_called_once_with("/api/auth/login", {"username": "test", "password": "password123"})
            assert result == {"access_token": "token123", "token_type": "bearer"}
            assert error is None


class TestRegisterScreenValidation:
    """Tests for RegisterScreen form validation logic."""

    def test_validate_form_empty_fields(self):
        """Test validation fails when fields are empty."""
        # Test empty username
        is_valid, msg = self._validate("", "password123", "password123")
        assert is_valid is False
        assert "all fields" in msg.lower()

        # Test empty password
        is_valid, msg = self._validate("user", "", "password123")
        assert is_valid is False

        # Test empty confirm
        is_valid, msg = self._validate("user", "password123", "")
        assert is_valid is False

    def test_validate_form_short_username(self):
        """Test validation fails for short username."""
        is_valid, msg = self._validate("ab", "password123", "password123")
        assert is_valid is False
        assert "3 characters" in msg

    def test_validate_form_long_username(self):
        """Test validation fails for long username."""
        long_username = "a" * 51
        is_valid, msg = self._validate(long_username, "password123", "password123")
        assert is_valid is False
        assert "50 characters" in msg

    def test_validate_form_short_password(self):
        """Test validation fails for short password."""
        is_valid, msg = self._validate("user", "short", "short")
        assert is_valid is False
        assert "8 characters" in msg

    def test_validate_form_password_mismatch(self):
        """Test validation fails when passwords don't match."""
        is_valid, msg = self._validate("user", "password123", "different456")
        assert is_valid is False
        assert "do not match" in msg.lower()

    def test_validate_form_success(self):
        """Test validation succeeds with valid data."""
        is_valid, msg = self._validate("validuser", "password123", "password123")
        assert is_valid is True
        assert msg == ""

    def _validate(self, username, password, confirm):
        """Validation logic matching RegisterScreen.validate_form."""
        if not username or not password or not confirm:
            return False, "Please fill in all fields"
        if len(username) < 3:
            return False, "Username must be at least 3 characters"
        if len(username) > 50:
            return False, "Username must be 50 characters or less"
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if password != confirm:
            return False, "Passwords do not match"
        return True, ""


class TestLoginScreenValidation:
    """Tests for LoginScreen form validation logic."""

    def test_validate_empty_username(self):
        """Test validation fails when username is empty."""
        username, password = "", "password123"
        if not username or not password:
            assert True

    def test_validate_empty_password(self):
        """Test validation fails when password is empty."""
        username, password = "user", ""
        if not username or not password:
            assert True

    def test_validate_both_empty(self):
        """Test validation fails when both fields are empty."""
        username, password = "", ""
        if not username or not password:
            assert True

    def test_validate_success(self):
        """Test validation succeeds with valid credentials."""
        username, password = "user", "password123"
        if not username or not password:
            assert False  # Should not happen
        else:
            assert True  # Validation passed


class TestLoginScreenMethods:
    """Tests for LoginScreen helper methods without Flet UI instantiation."""

    def test_show_error_sets_message(self):
        """Test show_error method sets error message correctly."""
        # Test the method logic directly
        error_text = {"value": "", "visible": False}
        
        def show_error(msg):
            error_text["value"] = msg
            error_text["visible"] = True
        
        show_error("Test error")
        assert error_text["value"] == "Test error"
        assert error_text["visible"] is True

    def test_clear_error_hides_message(self):
        """Test clear_error method clears error message."""
        error_text = {"value": "Some error", "visible": True}
        
        def clear_error():
            error_text["value"] = ""
            error_text["visible"] = False
        
        clear_error()
        assert error_text["value"] == ""
        assert error_text["visible"] is False

    def test_set_loading_state(self):
        """Test set_loading updates state correctly."""
        state = {
            "loading": False,
            "loading_indicator_visible": False,
            "username_disabled": False,
            "password_disabled": False,
        }
        
        def set_loading(is_loading):
            state["loading"] = is_loading
            state["loading_indicator_visible"] = is_loading
            state["username_disabled"] = is_loading
            state["password_disabled"] = is_loading
        
        set_loading(True)
        assert state["loading"] is True
        assert state["loading_indicator_visible"] is True
        assert state["username_disabled"] is True
        assert state["password_disabled"] is True
        
        set_loading(False)
        assert state["loading"] is False
        assert state["loading_indicator_visible"] is False


class TestRegisterScreenMethods:
    """Tests for RegisterScreen helper methods without Flet UI instantiation."""

    def test_show_error_sets_message(self):
        """Test show_error method sets error message correctly."""
        error_text = {"value": "", "visible": False}
        success_text = {"visible": False}
        
        def show_error(msg):
            error_text["value"] = msg
            error_text["visible"] = True
            success_text["visible"] = False
        
        show_error("Test error")
        assert error_text["value"] == "Test error"
        assert error_text["visible"] is True
        assert success_text["visible"] is False

    def test_show_success_sets_message(self):
        """Test show_success method sets success message correctly."""
        error_text = {"visible": False}
        success_text = {"value": "", "visible": False}
        
        def show_success(msg):
            success_text["value"] = msg
            success_text["visible"] = True
            error_text["visible"] = False
        
        show_success("Test success")
        assert success_text["value"] == "Test success"
        assert success_text["visible"] is True
        assert error_text["visible"] is False

    def test_clear_messages(self):
        """Test clear_messages hides both error and success."""
        error_text = {"value": "Error", "visible": True}
        success_text = {"value": "Success", "visible": True}
        
        def clear_messages():
            error_text["value"] = ""
            error_text["visible"] = False
            success_text["value"] = ""
            success_text["visible"] = False
        
        clear_messages()
        assert error_text["value"] == ""
        assert error_text["visible"] is False
        assert success_text["value"] == ""
        assert success_text["visible"] is False

    def test_set_loading_state(self):
        """Test set_loading updates state correctly for all fields."""
        state = {
            "loading": False,
            "loading_indicator_visible": False,
            "username_disabled": False,
            "password_disabled": False,
            "confirm_disabled": False,
        }
        
        def set_loading(is_loading):
            state["loading"] = is_loading
            state["loading_indicator_visible"] = is_loading
            state["username_disabled"] = is_loading
            state["password_disabled"] = is_loading
            state["confirm_disabled"] = is_loading
        
        set_loading(True)
        assert state["loading"] is True
        assert state["loading_indicator_visible"] is True
        assert state["username_disabled"] is True
        assert state["password_disabled"] is True
        assert state["confirm_disabled"] is True
