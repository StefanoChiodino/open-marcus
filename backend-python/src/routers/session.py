"""
Session router for FastAPI.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..schemas.session import (
    SessionUpdate,
    SessionResponse,
    SessionDetailResponse,
    SessionListResponse,
    SessionStateResponse,
    MessageCreate,
    MessageAddResponse,
    MessageResponse,
)
from ..services.database import get_database_service
from ..services.session import SessionService
from ..services.summary import SummaryService
from ..services.jwt import jwt_service


router = APIRouter(prefix="/api/sessions", tags=["sessions"])
security = HTTPBearer()


def get_db() -> Session:
    """Dependency to get database session."""
    db_service = get_database_service()
    return db_service.get_session()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and validate user ID from JWT token."""
    token = credentials.credentials
    user_id = jwt_service.get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_id


def get_session_service() -> SessionService:
    """Dependency to get session service."""
    return SessionService()


def get_summary_service() -> SummaryService:
    """Dependency to get summary service."""
    return SummaryService()


def session_to_response(session) -> SessionResponse:
    """Convert a Session model to SessionResponse schema."""
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        state=session.state,
        summary=session.summary,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else None,
        concluded_at=session.concluded_at.isoformat() if session.concluded_at else None,
    )


def message_to_response(message) -> MessageResponse:
    """Convert a Message model to MessageResponse schema."""
    return MessageResponse(
        id=message.id,
        session_id=message.session_id,
        role=message.role,
        content=message.content,
        created_at=message.created_at.isoformat() if message.created_at else "",
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """
    Create a new session for the current user.
    
    The session is created in 'intro' state.
    """
    session = session_service.create_session(db, user_id)
    return session_to_response(session)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> SessionListResponse:
    """
    List all sessions for the current user.
    
    Sessions are ordered by most recent first.
    """
    sessions = session_service.list_sessions(db, user_id, limit=limit, offset=offset)
    return SessionListResponse(
        sessions=[session_to_response(s) for s in sessions]
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> SessionDetailResponse:
    """
    Get a session by ID with its messages.
    
    Returns the full session including all messages.
    """
    session = session_service.get_session_with_messages(db, session_id, user_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        state=session.state,
        summary=session.summary,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else None,
        concluded_at=session.concluded_at.isoformat() if session.concluded_at else None,
        messages=[message_to_response(m) for m in session.messages]
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    data: SessionUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """
    Update a session (e.g., add summary).
    """
    session = session_service.update_session(
        db, session_id, user_id, summary=data.summary
    )
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session_to_response(session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> None:
    """
    Delete a session and all its messages.
    """
    deleted = session_service.delete_session(db, session_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )


@router.post("/{session_id}/messages", response_model=MessageAddResponse)
async def add_message(
    session_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> MessageAddResponse:
    """
    Add a message to a session.
    
    This transitions the session from 'intro' to 'active' state if it's the first message.
    Generates and stores an AI response from Marcus Aurelius.
    """
    message = session_service.add_message(
        db, session_id, user_id, role="user", content=data.content
    )
    
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Generate AI response (placeholder until LLM integration)
    ai_responses = [
        "I understand. The path to wisdom begins with self-reflection. What troubles your mind today?",
        "Remember, it is not that we have a short time to live, but that we waste a lot of it. What weighs on your spirit?",
        "The happiness of your life depends upon the quality of your thoughts. Share what is on your mind, and we shall examine it together.",
        "You have power over your mind - not outside events. Realize this, and you will find strength. What would you like to explore?",
        "The soul becomes dyed with the color of its thoughts. Speak freely, and we shall seek the truth together.",
    ]
    import random
    ai_content = random.choice(ai_responses)
    
    # Store AI response
    ai_message = session_service.add_ai_response(
        db, session_id, user_id, ai_content=ai_content
    )
    
    if ai_message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get updated session state
    session = session_service.get_session(db, session_id, user_id)
    
    # Return the AI response so it can be displayed to the user
    return MessageAddResponse(
        id=ai_message.id,
        session_id=ai_message.session_id,
        role=ai_message.role,
        content=ai_message.content,
        created_at=ai_message.created_at.isoformat() if ai_message.created_at else "",
        session_state=session.state if session else "unknown"
    )


@router.post("/{session_id}/end", response_model=SessionStateResponse)
async def end_session(
    session_id: str,
    summary: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service),
    summary_service: SummaryService = Depends(get_summary_service)
) -> SessionStateResponse:
    """
    End a session, transitioning it to 'concluded' state.
    
    Automatically generates an AI-powered summary of the session.
    Optionally provides a manual summary for the session.
    """
    session = session_service.end_session(db, session_id, user_id, summary=summary)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Automatically generate summary if one wasn't provided
    if summary is None:
        summary_service.generate_and_store_summary(db, session_id, user_id)
        # Refresh session to get updated summary
        session = session_service.get_session(db, session_id, user_id)
    
    return SessionStateResponse(
        id=session.id,
        state=session.state,
        message="Session ended successfully"
    )


@router.post("/{session_id}/summarize", response_model=SessionResponse)
async def generate_summary(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service),
    summary_service: SummaryService = Depends(get_summary_service)
) -> SessionResponse:
    """
    Generate an AI-powered summary for a session.
    
    Analyzes the session's messages and creates a summary
    that is stored with the session.
    """
    # Generate summary using the summary service
    generated_summary = summary_service.generate_and_store_summary(db, session_id, user_id)
    
    if generated_summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get updated session
    session = session_service.get_session(db, session_id, user_id)
    
    return session_to_response(session)


@router.get("/{session_id}/state", response_model=SessionStateResponse)
async def get_session_state(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service)
) -> SessionStateResponse:
    """
    Get the current state of a session.
    """
    state = session_service.get_session_state(db, session_id, user_id)
    
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return SessionStateResponse(
        id=session_id,
        state=state,
        message=f"Session is in '{state}' state"
    )
