"""
Tests for session summary service.
"""

import pytest

from src.services.session import SessionService
from src.services.summary import SummaryService
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
    user = auth_service.create_user(db, "summaryuser", "password123")
    return user


@pytest.fixture
def session_service():
    """Create a session service."""
    return SessionService()


@pytest.fixture
def summary_service():
    """Create a summary service."""
    return SummaryService()


class TestSummaryGeneration:
    """Tests for summary generation."""
    
    def test_generate_summary_empty_session(self, db, user, session_service, summary_service):
        """Test generating summary for empty session."""
        session = session_service.create_session(db, user.id)
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert summary is not None
        assert "Empty session" in summary
    
    def test_generate_summary_single_message(self, db, user, session_service, summary_service):
        """Test generating summary for session with single message."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello Marcus")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert summary is not None
        assert "1 user message" in summary
    
    def test_generate_summary_multiple_messages(self, db, user, session_service, summary_service):
        """Test generating summary for session with multiple messages."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello Marcus")
        session_service.add_message(db, session.id, user.id, "assistant", "Hello, how can I help?")
        session_service.add_message(db, session.id, user.id, "user", "I'm feeling stressed")
        session_service.add_message(db, session.id, user.id, "user", "What should I do about this?")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert summary is not None
        assert "3 user messages" in summary
    
    def test_generate_summary_detects_greeting(self, db, user, session_service, summary_service):
        """Test that greeting is detected in summary."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello Marcus, how are you?")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert "Greeting" in summary
    
    def test_generate_summary_detects_reflection(self, db, user, session_service, summary_service):
        """Test that self-reflection is detected in summary."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "I'm feeling anxious about work")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert "self-reflection" in summary or "anxious" in summary.lower()
    
    def test_generate_summary_detects_gratitude(self, db, user, session_service, summary_service):
        """Test that gratitude at end is detected."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello")
        session_service.add_message(db, session.id, user.id, "user", "Thank you for the wisdom")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert "gratitude" in summary.lower()
    
    def test_generate_summary_detects_stoic_principles(self, db, user, session_service, summary_service):
        """Test that Stoic principle mentions are detected."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello")
        session_service.add_message(db, session.id, user.id, "assistant", "Remember the virtue of wisdom")
        
        summary = summary_service.generate_summary(db, session.id, user.id)
        
        assert "Stoic" in summary or "virtue" in summary
    
    def test_generate_summary_nonexistent_session(self, db, user, summary_service):
        """Test generating summary for non-existent session returns None."""
        summary = summary_service.generate_summary(db, "nonexistent-id", user.id)
        
        assert summary is None
    
    def test_generate_summary_wrong_user(self, db, user, session_service, summary_service):
        """Test generating summary for session belonging to different user returns None."""
        session = session_service.create_session(db, user.id)
        
        summary = summary_service.generate_summary(db, session.id, "wrong-user-id")
        
        assert summary is None


class TestGenerateAndStoreSummary:
    """Tests for generate_and_store_summary method."""
    
    def test_generate_and_store_summary_updates_session(self, db, user, session_service, summary_service):
        """Test that summary is stored in session."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello Marcus")
        
        summary = summary_service.generate_and_store_summary(db, session.id, user.id)
        
        assert summary is not None
        
        # Verify session was updated
        updated_session = session_service.get_session(db, session.id, user.id)
        assert updated_session.summary is not None
        assert updated_session.summary == summary
    
    def test_generate_and_store_summary_nonexistent_session(self, db, user, summary_service):
        """Test that non-existent session returns None and doesn't crash."""
        summary = summary_service.generate_and_store_summary(db, "nonexistent-id", user.id)
        
        assert summary is None
    
    def test_generate_and_store_summary_preserves_existing_state(self, db, user, session_service, summary_service):
        """Test that generating summary doesn't change session state."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "Hello")
        
        _summary = summary_service.generate_and_store_summary(db, session.id, user.id)
        
        session_state = session_service.get_session_state(db, session.id, user.id)
        assert session_state == "active"  # State preserved
    
    def test_overwrite_existing_summary(self, db, user, session_service, summary_service):
        """Test that calling generate_and_store_summary overwrites previous summary."""
        session = session_service.create_session(db, user.id)
        session_service.add_message(db, session.id, user.id, "user", "First message")
        
        # Generate first summary
        summary1 = summary_service.generate_and_store_summary(db, session.id, user.id)
        
        # Add more messages
        session_service.add_message(db, session.id, user.id, "user", "Second message")
        
        # Generate new summary
        summary2 = summary_service.generate_and_store_summary(db, session.id, user.id)
        
        # Verify summary was updated (not necessarily different, but no error)
        assert summary1 is not None
        assert summary2 is not None
        
        updated_session = session_service.get_session(db, session.id, user.id)
        assert updated_session.summary == summary2
