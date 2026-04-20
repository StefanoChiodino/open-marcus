"""
Tests for authentication endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.models import Base
from src.api import create_app


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
    # Import models to ensure they're registered with Base
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
    
    # Override database dependency
    from src.routers.auth import get_db
    app.dependency_overrides[get_db] = override_get_db
    
    # Disable startup event that initializes database
    # Instead, we'll directly set up the test database
    
    with TestClient(app) as test_client:
        yield test_client


class TestUserRegistration:
    """Tests for user registration endpoint."""
    
    def test_register_success(self, client):
        """Test successful user registration."""
        response = client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "securepassword123"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "testuser"
        assert "id" in data
        assert "created_at" in data
    
    def test_register_duplicate_username(self, client):
        """Test registration with existing username fails."""
        # First registration
        client.post(
            "/api/auth/register",
            json={"username": "duplicateuser", "password": "password123"}
        )
        
        # Second registration with same username
        response = client.post(
            "/api/auth/register",
            json={"username": "duplicateuser", "password": "differentpassword"}
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_register_short_password(self, client):
        """Test registration with short password fails."""
        response = client.post(
            "/api/auth/register",
            json={"username": "testuser", "password": "short"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_register_short_username(self, client):
        """Test registration with short username fails."""
        response = client.post(
            "/api/auth/register",
            json={"username": "ab", "password": "password123"}
        )
        
        assert response.status_code == 422  # Validation error


class TestUserLogin:
    """Tests for user login endpoint."""
    
    def test_login_success(self, client):
        """Test successful login returns JWT token."""
        # Register user first
        client.post(
            "/api/auth/register",
            json={"username": "loginuser", "password": "password123"}
        )
        
        # Login
        response = client.post(
            "/api/auth/login",
            json={"username": "loginuser", "password": "password123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password fails."""
        # Register user first
        client.post(
            "/api/auth/register",
            json={"username": "wrongpassuser", "password": "correctpassword"}
        )
        
        # Login with wrong password
        response = client.post(
            "/api/auth/login",
            json={"username": "wrongpassuser", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user fails."""
        response = client.post(
            "/api/auth/login",
            json={"username": "nonexistent", "password": "password123"}
        )
        
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]


class TestProtectedEndpoints:
    """Tests for protected endpoints requiring JWT."""
    
    def test_get_me_without_token(self, client):
        """Test accessing protected endpoint without token fails."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401  # Unauthorized - no credentials
    
    def test_get_me_with_invalid_token(self, client):
        """Test accessing protected endpoint with invalid token fails."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalidtoken"}
        )
        
        assert response.status_code == 401
    
    def test_get_me_with_valid_token(self, client):
        """Test accessing protected endpoint with valid token succeeds."""
        # Register and login
        client.post(
            "/api/auth/register",
            json={"username": "validuser", "password": "password123"}
        )
        
        login_response = client.post(
            "/api/auth/login",
            json={"username": "validuser", "password": "password123"}
        )
        
        token = login_response.json()["access_token"]
        
        # Access protected endpoint
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "validuser"


class TestTokenVerification:
    """Tests for token verification endpoint."""
    
    def test_verify_valid_token(self, client):
        """Test verifying a valid token succeeds."""
        # Register and login
        client.post(
            "/api/auth/register",
            json={"username": "verifyuser", "password": "password123"}
        )
        
        login_response = client.post(
            "/api/auth/login",
            json={"username": "verifyuser", "password": "password123"}
        )
        
        token = login_response.json()["access_token"]
        
        # Verify token
        response = client.post(
            "/api/auth/verify",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "valid" in response.json()["message"]
    
    def test_verify_invalid_token(self, client):
        """Test verifying an invalid token fails."""
        response = client.post(
            "/api/auth/verify",
            headers={"Authorization": "Bearer invalidtoken"}
        )
        
        assert response.status_code == 401


class TestPasswordHashing:
    """Tests for password hashing service."""
    
    def test_password_hash_not_plaintext(self):
        """Test that hashed password is not plain text."""
        from src.services.password import PasswordService
        
        password = "mysecretpassword"
        hashed = PasswordService.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > len(password)
        assert "$argon2" in hashed or "$argon2id" in hashed
    
    def test_password_verify_correct(self):
        """Test password verification with correct password."""
        from src.services.password import PasswordService
        
        password = "mysecretpassword"
        hashed = PasswordService.hash_password(password)
        
        assert PasswordService.verify_password(password, hashed) is True
    
    def test_password_verify_incorrect(self):
        """Test password verification with incorrect password."""
        from src.services.password import PasswordService
        
        password = "mysecretpassword"
        hashed = PasswordService.hash_password(password)
        
        assert PasswordService.verify_password("wrongpassword", hashed) is False


class TestJWTService:
    """Tests for JWT service."""
    
    def test_create_access_token(self):
        """Test JWT token creation."""
        from src.services.jwt import JWTService
        
        jwt_svc = JWTService(secret_key="test-secret")
        token = jwt_svc.create_access_token(user_id="user123", username="testuser")
        
        assert token is not None
        assert len(token) > 0
    
    def test_verify_valid_token(self):
        """Test JWT token verification with valid token."""
        from src.services.jwt import JWTService
        
        jwt_svc = JWTService(secret_key="test-secret")
        token = jwt_svc.create_access_token(user_id="user123", username="testuser")
        
        token_data = jwt_svc.verify_token(token)
        
        assert token_data is not None
        assert token_data.user_id == "user123"
        assert token_data.username == "testuser"
    
    def test_verify_invalid_token(self):
        """Test JWT token verification with invalid token."""
        from src.services.jwt import JWTService
        
        jwt_svc = JWTService(secret_key="test-secret")
        token_data = jwt_svc.verify_token("invalidtoken")
        
        assert token_data is None
    
    def test_get_user_id_from_token(self):
        """Test extracting user_id from token."""
        from src.services.jwt import JWTService
        
        jwt_svc = JWTService(secret_key="test-secret")
        token = jwt_svc.create_access_token(user_id="user123", username="testuser")
        
        user_id = jwt_svc.get_user_id_from_token(token)
        
        assert user_id == "user123"
