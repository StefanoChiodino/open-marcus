"""Tests for database models and service."""

import os
import tempfile
import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.models import Base, User, Profile, Session, Message, PsychUpdate, SemanticAssertion, Settings
from src.services.database import DatabaseService


@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"
    engine = create_engine(url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_factory()
    yield session
    session.close()
    engine.dispose()
    os.unlink(path)


class TestUserModel:
    """Tests for User model."""
    
    def test_create_user(self, temp_db):
        """Test creating a user."""
        user = User(
            id=str(uuid.uuid4()),
            username="testuser",
            password_hash="hashed_password"
        )
        temp_db.add(user)
        temp_db.commit()
        
        result = temp_db.query(User).filter_by(username="testuser").first()
        assert result is not None
        assert result.username == "testuser"
        assert result.password_hash == "hashed_password"
    
    def test_user_relationships(self, temp_db):
        """Test user relationships to profile, sessions, settings."""
        user = User(
            id=str(uuid.uuid4()),
            username="testuser2",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        # Create profile
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Test User",
            goals="Better focus",
            experience_level="intermediate"
        )
        temp_db.add(profile)
        
        # Create session
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            state="intro"
        )
        temp_db.add(session)
        
        # Create settings
        settings = Settings(
            id=str(uuid.uuid4()),
            user_id=user.id,
            selected_model="phi3-mini"
        )
        temp_db.add(settings)
        
        temp_db.commit()
        
        # Verify relationships
        assert user.profile is not None
        assert len(user.sessions) == 1
        assert user.settings is not None


class TestProfileModel:
    """Tests for Profile model."""
    
    def test_create_profile(self, temp_db):
        """Test creating a profile."""
        user = User(
            id=str(uuid.uuid4()),
            username="profiletest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="John Doe",
            goals="Reduce anxiety",
            experience_level="beginner"
        )
        temp_db.add(profile)
        temp_db.commit()
        
        result = temp_db.query(Profile).filter_by(user_id=user.id).first()
        assert result is not None
        assert result.name == "John Doe"
        assert result.goals == "Reduce anxiety"
        assert result.experience_level == "beginner"


class TestSessionModel:
    """Tests for Session model."""
    
    def test_create_session(self, temp_db):
        """Test creating a session with default state."""
        user = User(
            id=str(uuid.uuid4()),
            username="sessiontest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            state="intro"
        )
        temp_db.add(session)
        temp_db.commit()
        
        result = temp_db.query(Session).filter_by(user_id=user.id).first()
        assert result is not None
        assert result.state == "intro"
        assert result.summary is None
    
    def test_session_with_messages(self, temp_db):
        """Test session with messages."""
        user = User(
            id=str(uuid.uuid4()),
            username="msgtagtest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            state="active"
        )
        temp_db.add(session)
        temp_db.commit()
        
        # Add messages
        msg1 = Message(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role="user",
            content="Hello Marcus"
        )
        msg2 = Message(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role="assistant",
            content="Greetings, how can I help you today?"
        )
        temp_db.add_all([msg1, msg2])
        temp_db.commit()
        
        assert len(session.messages) == 2


class TestMessageModel:
    """Tests for Message model."""
    
    def test_create_message(self, temp_db):
        """Test creating a message."""
        user = User(
            id=str(uuid.uuid4()),
            username="msgtest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            state="active"
        )
        temp_db.add(session)
        temp_db.commit()
        
        message = Message(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role="user",
            content="I am feeling stressed"
        )
        temp_db.add(message)
        temp_db.commit()
        
        result = temp_db.query(Message).filter_by(session_id=session.id).first()
        assert result is not None
        assert result.role == "user"
        assert result.content == "I am feeling stressed"


class TestPsychUpdateModel:
    """Tests for PsychUpdate model."""
    
    def test_create_psych_update(self, temp_db):
        """Test creating a psych update."""
        user = User(
            id=str(uuid.uuid4()),
            username="psychtest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        session = Session(
            id=str(uuid.uuid4()),
            user_id=user.id,
            state="active"
        )
        temp_db.add(session)
        temp_db.commit()
        
        message = Message(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role="user",
            content="Test message"
        )
        temp_db.add(message)
        temp_db.commit()
        
        psych_update = PsychUpdate(
            id=str(uuid.uuid4()),
            message_id=message.id,
            detected_patterns=["anxiety", "overthinking"],
            emotional_state="stressed",
            stoic_principle_applied="Amor Fati",
            suggested_direction="Focus on what you can control",
            confidence=0.75
        )
        temp_db.add(psych_update)
        temp_db.commit()
        
        result = temp_db.query(PsychUpdate).filter_by(message_id=message.id).first()
        assert result is not None
        assert result.emotional_state == "stressed"
        assert "anxiety" in result.detected_patterns


class TestSemanticAssertionModel:
    """Tests for SemanticAssertion model."""
    
    def test_create_semantic_assertion(self, temp_db):
        """Test creating a semantic assertion."""
        user = User(
            id=str(uuid.uuid4()),
            username="semantictest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        assertion = SemanticAssertion(
            id=str(uuid.uuid4()),
            user_id=user.id,
            text="User is working on managing anxiety",
            confidence=0.85,
            category="goal"
        )
        temp_db.add(assertion)
        temp_db.commit()
        
        result = temp_db.query(SemanticAssertion).filter_by(user_id=user.id).first()
        assert result is not None
        assert result.confidence == 0.85
        assert result.category == "goal"


class TestSettingsModel:
    """Tests for Settings model."""
    
    def test_create_settings(self, temp_db):
        """Test creating settings with defaults."""
        user = User(
            id=str(uuid.uuid4()),
            username="settingstest",
            password_hash="hash"
        )
        temp_db.add(user)
        temp_db.commit()
        
        settings = Settings(
            id=str(uuid.uuid4()),
            user_id=user.id,
            ram_detected=16.0
        )
        temp_db.add(settings)
        temp_db.commit()
        
        result = temp_db.query(Settings).filter_by(user_id=user.id).first()
        assert result is not None
        assert result.tts_voice == "en_US-lessac-medium"
        assert result.tts_speed == 1.0
        assert result.stt_enabled is True


class TestDatabaseService:
    """Tests for DatabaseService."""
    
    def test_database_service_creates_tables(self):
        """Test that DatabaseService creates tables correctly."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        os.unlink(path)
        
        try:
            db_service = DatabaseService(f"sqlite:///{path}")
            db_service.create_tables()
            
            # Verify tables exist by creating a user
            session = db_service.get_session()
            user = User(id=str(uuid.uuid4()), username="test", password_hash="hash")
            session.add(user)
            session.commit()
            
            result = session.query(User).filter_by(username="test").first()
            assert result is not None
            
            session.close()
            db_service.close()
        finally:
            if os.path.exists(path):
                os.unlink(path)
    
    def test_database_service_context_manager(self):
        """Test DatabaseService as context manager."""
        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        os.unlink(path)
        
        try:
            with DatabaseService(f"sqlite:///{path}") as db_service:
                db_service.create_tables()
                session = db_service.get_session()
                user = User(id=str(uuid.uuid4()), username="cmtest", password_hash="hash")
                session.add(user)
                session.commit()
                
                result = session.query(User).filter_by(username="cmtest").first()
                assert result is not None
                session.close()
        finally:
            if os.path.exists(path):
                os.unlink(path)
