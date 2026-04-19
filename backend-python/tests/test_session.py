"""
Tests for session service and endpoints.
"""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from src.models import Session as SessionModel, Message as MessageModel, User
from src.services.session import SessionService, SessionNotFoundError
from src.services.database import DatabaseService
from src.services.auth import AuthService


@pytest.fixture
def db_service():
    """Create a fresh database for each test."""
    service = DatabaseService(database_url="sqlite:///:memory:")
    service.create_tables()
    yield service
    service.close()


@pytest.fixture
def db(db_service):
    """Get a database session."""
    return db_service.get_session()


@pytest.fixture
def user(db):
    """Create a test user."""
    auth_service = AuthService()
    user = auth_service.create_user(db, "testuser", "password123")
    return user


@pytest.fixture
def session_service():
    """Create a session service."""
    return SessionService()


class TestSessionCreation:
    """Tests for session creation."""
    
    def test_create_session_creates_with_intro_state(self, db, user, session_service):
        """Test that a new session is created in 'intro' state."""
        session = session_service.create_session(db, user.id)
        
        assert session is not None
        assert session.user_id == user.id
        assert session.state == "intro"
        assert session.summary is None
        assert session.concluded_at is None
    
    def test_create_session_sets_created_at(self, db, user, session_service):
        """Test that created_at is set on session creation."""
        session = session_service.create_session(db, user.id)
        
        assert session.created_at is not None
        assert isinstance(session.created_at, datetime)


class TestSessionRetrieval:
    """Tests for session retrieval."""
    
    def test_get_session_returns_session(self, db, user, session_service):
        """Test getting an existing session."""
        created = session_service.create_session(db, user.id)
        
        retrieved = session_service.get_session(db, created.id, user.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.user_id == user.id
    
    def test_get_session_returns_none_for_wrong_user(self, db, user, session_service):
        """Test that getting another user's session returns None."""
        session = session_service.create_session(db, user.id)
        
        retrieved = session_service.get_session(db, session.id, "wrong-user-id")
        
        assert retrieved is None
    
    def test_get_session_returns_none_for_nonexistent(self, db, user, session_service):
        """Test that getting a non-existent session returns None."""
        retrieved = session_service.get_session(db, "nonexistent-id", user.id)
        
        assert retrieved is None


class TestSessionList:
    """Tests for listing sessions."""
    
    def test_list_sessions_returns_user_sessions(self, db, user, session_service):
        """Test listing sessions for a user."""
        session_service.create_session(db, user.id)
        session_service.create_session(db, user.id)
        session_service.create_session(db, user.id)
        
        sessions = session_service.list_sessions(db, user.id)
        
        assert len(sessions) == 3
    
    def test_list_sessions_ordered_by_created_at_desc(self, db, user, session_service):
        """Test that sessions are ordered by most recent first."""
        s1 = session_service.create_session(db, user.id)
        s2 = session_service.create_session(db, user.id)
        s3 = session_service.create_session(db, user.id)
        
        sessions = session_service.list_sessions(db, user.id)
        
        # Most recent first
        assert sessions[0].id == s3.id
        assert sessions[1].id == s2.id
        assert sessions[2].id == s1.id
    
    def test_list_sessions_respects_limit(self, db, user, session_service):
        """Test that limit is respected."""
        for _ in range(5):
            session_service.create_session(db, user.id)
        
        sessions = session_service.list_sessions(db, user.id, limit=3)
        
        assert len(sessions) == 3
    
    def test_list_sessions_respects_offset(self, db, user, session_service):
        """Test that offset is respected."""
        for _ in range(5):
            session_service.create_session(db, user.id)
        
        sessions = session_service.list_sessions(db, user.id, limit=3, offset=2)
        
        assert len(sessions) == 3
    
    def test_list_sessions_empty_for_user_without_sessions(self, db, user, session_service):
        """Test that a user with no sessions gets empty list."""
        sessions = session_service.list_sessions(db, user.id)
        
        assert len(sessions) == 0


class TestSessionUpdate:
    """Tests for session updates."""
    
    def test_update_session_adds_summary(self, db, user, session_service):
        """Test adding a summary to a session."""
        session = session_service.create_session(db, user.id)
        
        updated = session_service.update_session(db, session.id, user.id, summary="Great session")
        
        assert updated is not None
        assert updated.summary == "Great session"
    
    def test_update_session_returns_none_for_wrong_user(self, db, user, session_service):
        """Test that updating another user's session returns None."""
        session = session_service.create_session(db, user.id)
        
        updated = session_service.update_session(db, session.id, "wrong-user-id", summary="Test")
        
        assert updated is None


class TestSessionDelete:
    """Tests for session deletion."""
    
    def test_delete_session_returns_true(self, db, user, session_service):
        """Test that deleting a session returns True."""
        session = session_service.create_session(db, user.id)
        
        result = session_service.delete_session(db, session.id, user.id)
        
        assert result is True
    
    def test_delete_session_removes_from_db(self, db, user, session_service):
        """Test that deleted session is removed from database."""
        session = session_service.create_session(db, user.id)
        session_id = session.id
        
        session_service.delete_session(db, session_id, user.id)
        
        retrieved = session_service.get_session(db, session_id, user.id)
        assert retrieved is None
    
    def test_delete_session_returns_false_for_nonexistent(self, db, user, session_service):
        """Test that deleting non-existent session returns False."""
        result = session_service.delete_session(db, "nonexistent-id", user.id)
        
        assert result is False


class TestSessionStateMachine:
    """Tests for session state transitions."""
    
    def test_add_message_transitions_from_intro_to_active(self, db, user, session_service):
        """Test that adding a message transitions state from intro to active."""
        session = session_service.create_session(db, user.id)
        assert session.state == "intro"
        
        message = session_service.add_message(db, session.id, user.id, "user", "Hello Marcus")
        
        assert message is not None
        updated_session = session_service.get_session(db, session.id, user.id)
        assert updated_session.state == "active"
    
    def test_add_message_keeps_active_state(self, db, user, session_service):
        """Test that adding another message keeps state as active."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "First message")
        
        session = session_service.get_session(db, session.id, user.id)
        assert session.state == "active"
        
        session_service.add_message(db, session.id, user.id, "assistant", "Hello")
        
        session = session_service.get_session(db, session.id, user.id)
        assert session.state == "active"
    
    def test_end_session_transitions_to_concluded(self, db, user, session_service):
        """Test that ending a session transitions to concluded."""
        session = session_service.create_session(db, user.id)
        
        ended = session_service.end_session(db, session.id, user.id)
        
        assert ended is not None
        assert ended.state == "concluded"
        assert ended.concluded_at is not None
    
    def test_end_session_sets_summary(self, db, user, session_service):
        """Test that ending a session can set summary."""
        session = session_service.create_session(db, user.id)
        
        ended = session_service.end_session(db, session.id, user.id, summary="Reflective session")
        
        assert ended.summary == "Reflective session"
    
    def test_end_active_session_transitions_to_concluded(self, db, user, session_service):
        """Test ending an active session transitions to concluded."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello")
        
        session = session_service.get_session(db, session.id, user.id)
        assert session.state == "active"
        
        ended = session_service.end_session(db, session.id, user.id)
        
        assert ended.state == "concluded"
    
    def test_get_session_state(self, db, user, session_service):
        """Test getting session state."""
        session = session_service.create_session(db, user.id)
        
        state = session_service.get_session_state(db, session.id, user.id)
        
        assert state == "intro"
    
    def test_get_session_state_returns_none_for_wrong_user(self, db, user, session_service):
        """Test that getting state for wrong user returns None."""
        session = session_service.create_session(db, user.id)
        
        state = session_service.get_session_state(db, session.id, "wrong-user")
        
        assert state is None


class TestSessionWithMessages:
    """Tests for session with messages."""
    
    def test_create_session_has_empty_messages(self, db, user, session_service):
        """Test that a new session has no messages."""
        session = session_service.create_session(db, user.id)
        
        assert len(session.messages) == 0
    
    def test_add_message_to_session(self, db, user, session_service):
        """Test adding a message to a session."""
        session = session_service.create_session(db, user.id)
        
        message = session_service.add_message(db, session.id, user.id, "user", "Test message")
        
        assert message is not None
        assert message.role == "user"
        assert message.content == "Test message"
        assert message.session_id == session.id
    
    def test_get_session_with_messages(self, db, user, session_service):
        """Test getting a session with its messages."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "First")
        session_service.add_message(db, session.id, user.id, "assistant", "Second")
        
        retrieved = session_service.get_session_with_messages(db, session.id, user.id)
        
        assert len(retrieved.messages) == 2


class TestSessionDetailWithMessages:
    """Tests for getting session detail with messages."""
    
    def test_session_detail_includes_messages(self, db, user, session_service):
        """Test that session detail includes messages."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello")
        session_service.add_message(db, session.id, user.id, "assistant", "Hi there")
        
        retrieved = session_service.get_session_with_messages(db, session.id, user.id)
        
        assert len(retrieved.messages) == 2
        assert retrieved.messages[0].content == "Hello"
        assert retrieved.messages[1].content == "Hi there"
