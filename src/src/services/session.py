"""
Session service handling session CRUD operations and state machine.
"""

from typing import Optional, List
from datetime import datetime

from sqlalchemy.orm import Session as DBSession

from ..models.session import Session as SessionModel
from ..models.message import Message as MessageModel


class SessionStateError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


class SessionNotFoundError(Exception):
    """Raised when a session is not found."""
    pass


class SessionService:
    """
    Service for session operations with state machine.
    
    State transitions:
    - intro -> active: When first message is added
    - active -> concluded: When session is ended
    - intro -> concluded: Direct transition allowed
    """
    
    VALID_STATES = ["intro", "active", "concluded"]
    TERMINAL_STATES = ["concluded"]
    
    def create_session(self, db: DBSession, user_id: str) -> SessionModel:
        """
        Create a new session in 'intro' state.
        
        Args:
            db: Database session
            user_id: ID of the user creating the session
            
        Returns:
            Created Session object
        """
        session = SessionModel(
            user_id=user_id,
            state="intro",
            created_at=datetime.utcnow()
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return session
    
    def get_session(self, db: DBSession, session_id: str, user_id: str) -> Optional[SessionModel]:
        """
        Get a session by ID, ensuring it belongs to the user.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            Session object if found and belongs to user, None otherwise
        """
        return db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.user_id == user_id
        ).first()
    
    def get_session_with_messages(self, db: DBSession, session_id: str, user_id: str) -> Optional[SessionModel]:
        """
        Get a session by ID with its messages loaded.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            Session object with messages if found, None otherwise
        """
        return db.query(SessionModel).filter(
            SessionModel.id == session_id,
            SessionModel.user_id == user_id
        ).first()
    
    def list_sessions(self, db: DBSession, user_id: str, limit: int = 50, offset: int = 0) -> List[SessionModel]:
        """
        List all sessions for a user, ordered by most recent first.
        
        Args:
            db: Database session
            user_id: ID of the user
            limit: Maximum number of sessions to return
            offset: Number of sessions to skip
            
        Returns:
            List of Session objects
        """
        return db.query(SessionModel).filter(
            SessionModel.user_id == user_id
        ).order_by(
            SessionModel.created_at.desc()
        ).offset(offset).limit(limit).all()
    
    def update_session(self, db: DBSession, session_id: str, user_id: str, summary: Optional[str] = None) -> Optional[SessionModel]:
        """
        Update a session (e.g., add summary).
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            summary: Optional new summary
            
        Returns:
            Updated Session object if found, None otherwise
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return None
        
        if summary is not None:
            session.summary = summary
        
        session.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(session)
        
        return session
    
    def delete_session(self, db: DBSession, session_id: str, user_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            True if deleted, False if not found
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return False
        
        db.delete(session)
        db.commit()
        
        return True
    
    def add_message(self, db: DBSession, session_id: str, user_id: str, role: str, content: str) -> Optional[MessageModel]:
        """
        Add a message to a session. This transitions the session from 'intro' to 'active' state.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            role: Message role ('user' or 'assistant')
            content: Message content
            
        Returns:
            Created Message object if successful, None if session not found
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return None
        
        # State transition: intro -> active
        if session.state == "intro":
            session.state = "active"
            session.updated_at = datetime.utcnow()
        
        message = MessageModel(
            session_id=session_id,
            role=role,
            content=content,
            created_at=datetime.utcnow()
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return message
    
    def add_ai_response(self, db: DBSession, session_id: str, user_id: str, ai_content: str) -> Optional[MessageModel]:
        """
        Add an AI response message to a session.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            ai_content: AI response content
            
        Returns:
            Created AI Message object if successful, None if session not found
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return None
        
        ai_message = MessageModel(
            session_id=session_id,
            role="assistant",
            content=ai_content,
            created_at=datetime.utcnow()
        )
        
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        return ai_message
    
    def end_session(self, db: DBSession, session_id: str, user_id: str, summary: Optional[str] = None) -> Optional[SessionModel]:
        """
        End a session, transitioning it to 'concluded' state.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            summary: Optional summary for the session
            
        Returns:
            Updated Session object if successful, None if session not found
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return None
        
        # State transition: intro/active -> concluded
        if session.state not in self.TERMINAL_STATES:
            session.state = "concluded"
            session.concluded_at = datetime.utcnow()
            session.updated_at = datetime.utcnow()
        
        if summary is not None:
            session.summary = summary
        
        db.commit()
        db.refresh(session)
        
        return session
    
    def get_session_state(self, db: DBSession, session_id: str, user_id: str) -> Optional[str]:
        """
        Get the current state of a session.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            State string if session found, None otherwise
        """
        session = self.get_session(db, session_id, user_id)
        
        if session is None:
            return None
        
        return session.state


# Global instance
session_service = SessionService()
