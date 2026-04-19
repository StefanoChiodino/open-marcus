"""
Tests for data export endpoints.
"""

import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.models import Base, User, Profile, Session, Message, Settings, PsychUpdate, SemanticAssertion
from src.api import create_app
from src.services.database import DatabaseService


# Create test database
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest.fixture(scope="function")
def test_db():
    """Create test database tables."""
    Base.metadata.create_all(test_engine)
    yield
    Base.metadata.drop_all(test_engine)


def override_get_db():
    """Override database dependency for testing."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with test database."""
    app = create_app()
    
    # Override database dependency for all routers that use get_db
    from src.routers.auth import get_db as auth_get_db
    from src.routers.profile import get_db as profile_get_db
    from src.routers.session import get_db as session_get_db
    from src.routers.settings import get_db as settings_get_db
    
    app.dependency_overrides[auth_get_db] = override_get_db
    app.dependency_overrides[profile_get_db] = override_get_db
    app.dependency_overrides[session_get_db] = override_get_db
    app.dependency_overrides[settings_get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def auth_token(client):
    """Create a user and return auth token."""
    # Register user
    client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"}
    )
    
    # Login
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"}
    )
    
    return response.json()["access_token"]


class TestDataExport:
    """Tests for data export endpoint."""
    
    def test_export_requires_auth(self, client):
        """Test that export endpoint requires authentication."""
        response = client.post("/api/settings/export")
        assert response.status_code == 401
    
    def test_export_json_format(self, client, auth_token):
        """Test exporting data as JSON."""
        response = client.post(
            "/api/settings/export?format=json",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        # Parse the response
        data = response.json()
        
        # Check structure
        assert "exported_at" in data
        assert "app_version" in data
        assert data["app_version"] == "0.1.0"
        assert "user" in data
        assert "profile" in data
        assert "settings" in data
        assert "sessions" in data
        assert "memories" in data
    
    def test_export_invalid_format(self, client, auth_token):
        """Test export with invalid format returns error."""
        response = client.post(
            "/api/settings/export?format=invalid",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 400
        assert "Invalid format" in response.json()["detail"]
    
    def test_export_contains_user_data(self, client, auth_token):
        """Test that export contains user data."""
        response = client.post(
            "/api/settings/export?format=json",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        data = response.json()
        
        assert data["user"] is not None
        assert data["user"]["username"] == "testuser"
        assert "id" in data["user"]
        assert "created_at" in data["user"]
    
    def test_export_contains_sessions(self, client, auth_token):
        """Test that export contains sessions array."""
        response = client.post(
            "/api/settings/export?format=json",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        data = response.json()
        
        assert "sessions" in data
        assert isinstance(data["sessions"], list)


class TestDataClear:
    """Tests for data clear endpoint."""
    
    def test_clear_requires_auth(self, client):
        """Test that clear endpoint requires authentication."""
        response = client.delete("/api/settings/clear-data")
        assert response.status_code == 401
    
    def test_clear_all_data(self, client, auth_token):
        """Test clearing all user data."""
        # First, verify user exists
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Clear data
        response = client.delete(
            "/api/settings/clear-data",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        assert "cleared" in response.json()["message"]
        
        # Now user should be deleted (returns 404 not found, or 401 if token also invalidated)
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Either 401 (unauthorized - token no longer valid) or 404 (not found - user deleted) is acceptable
        assert response.status_code in (401, 404)
