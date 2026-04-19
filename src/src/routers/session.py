"""
Session router for FastAPI.
"""

import json
from typing import Optional, AsyncIterator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
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
from ..services.llm import LLMService, get_llm_service as get_llm_svc
from ..services.persona import PersonaService, get_persona_service
from ..services.psych_update import PsychUpdateService, get_psych_update_service


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


def get_llm_service_dep() -> LLMService:
    """Dependency to get LLM service."""
    return get_llm_svc()


def get_persona_service_dep() -> PersonaService:
    """Dependency to get persona service."""
    return get_persona_service()


def get_psych_update_service_dep() -> PsychUpdateService:
    """Dependency to get psych update service."""
    return get_psych_update_service()


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
    session_service: SessionService = Depends(get_session_service),
    llm_service: LLMService = Depends(get_llm_service_dep),
    persona_service: PersonaService = Depends(get_persona_service_dep),
    psych_update_service: PsychUpdateService = Depends(get_psych_update_service_dep)
) -> MessageAddResponse:
    """
    Add a message to a session.
    
    This transitions the session from 'intro' to 'active' state if it's the first message.
    Generates and stores an AI response from Marcus Aurelius using local LLM.
    Uses PersonaService to build the system prompt incorporating user profile and history.
    After the AI response, generates a PsychUpdate with psychological analysis.
    """
    # First, store the user's message
    user_message = session_service.add_message(
        db, session_id, user_id, role="user", content=data.content
    )
    
    if user_message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session with messages to build conversation context
    session = session_service.get_session_with_messages(db, session_id, user_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Build conversation messages using PersonaService
    messages_for_llm = persona_service.build_chat_messages_with_persona(
        db=db,
        user_id=user_id,
        conversation_history=session.messages,
        new_user_message=data.content,
    )
    
    # Generate AI response using LLM service
    ai_content = llm_service.create_chat_completion(
        messages=messages_for_llm,
        max_tokens=256,
        temperature=0.7,
    )
    
    # Store AI response
    ai_message = session_service.add_ai_response(
        db, session_id, user_id, ai_content=ai_content
    )
    
    if ai_message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Generate PsychUpdate with psychological analysis
    psych_update_service.generate_psych_update(
        db=db,
        user_id=user_id,
        message_id=user_message.id,
        user_message=data.content,
        ai_response=ai_content,
    )
    db.commit()
    
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


async def _stream_llm_response(
    session_id: str,
    user_id: str,
    user_message_content: str,
    db: Session,
    session_service: SessionService,
    llm_service: LLMService,
    persona_service: PersonaService,
    psych_update_service: PsychUpdateService,
) -> AsyncIterator[str]:
    """
    Internal generator that streams LLM response tokens as SSE events.
    
    Stores the user's message first, then streams AI response tokens.
    Finally stores the full AI response.
    Uses PersonaService to build the system prompt with user context.
    After the AI response is stored, generates a PsychUpdate with psychological analysis.
    """
    # Store the user's message
    user_message = session_service.add_message(
        db, session_id, user_id, role="user", content=user_message_content
    )
    
    if user_message is None:
        yield f"data: {json.dumps({'type': 'error', 'error': 'Session not found'})}\n\n"
        return
    
    # Get session with messages to build conversation context
    session = session_service.get_session_with_messages(db, session_id, user_id)
    
    if session is None:
        yield f"data: {json.dumps({'type': 'error', 'error': 'Session not found'})}\n\n"
        return
    
    # Build conversation messages using PersonaService
    messages_for_llm = persona_service.build_chat_messages_with_persona(
        db=db,
        user_id=user_id,
        conversation_history=session.messages,
        new_user_message=user_message_content,
    )
    
    # Send session state update (transition from intro to active if first message)
    session_state = session.state
    yield f"data: {json.dumps({'type': 'session_state', 'state': session_state})}\n\n"
    
    # Stream the LLM response tokens
    full_response = ""
    async for chunk in llm_service.stream_chat_completion(
        messages=messages_for_llm,
        max_tokens=256,
        temperature=0.7,
    ):
        if chunk.is_final:
            break
        if chunk.content:
            full_response += chunk.content
            yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"
    
    # Store the complete AI response
    if full_response:
        ai_message = session_service.add_ai_response(
            db, session_id, user_id, ai_content=full_response
        )
        
        # Generate PsychUpdate with psychological analysis
        if user_message and ai_message:
            psych_update_service.generate_psych_update(
                db=db,
                user_id=user_id,
                message_id=user_message.id,
                user_message=user_message_content,
                ai_response=full_response,
            )
            db.commit()
        
        # Get updated session state
        updated_session = session_service.get_session(db, session_id, user_id)
        
        # Send completion event with message details
        complete_data = {
            'type': 'complete',
            'message_id': ai_message.id if ai_message else None,
            'content': full_response,
            'session_state': updated_session.state if updated_session else 'unknown'
        }
        yield f"data: {json.dumps(complete_data)}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'complete', 'message_id': None, 'content': '', 'session_state': session.state})}\n\n"


@router.post("/{session_id}/messages/stream")
async def stream_message(
    session_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
    session_service: SessionService = Depends(get_session_service),
    llm_service: LLMService = Depends(get_llm_service_dep),
    persona_service: PersonaService = Depends(get_persona_service_dep),
    psych_update_service: PsychUpdateService = Depends(get_psych_update_service_dep)
) -> StreamingResponse:
    """
    Add a message to a session with streaming response.
    
    This endpoint streams AI response tokens back to the client using Server-Sent Events (SSE).
    The user's message is stored immediately, then AI tokens are streamed as they are generated.
    Once complete, the full AI response is stored.
    
    Uses PersonaService to build the system prompt with user profile and history.
    After the AI response, generates a PsychUpdate with psychological analysis.
    
    SSE Events:
    - {'type': 'session_state', 'state': 'intro|active'} - Session state info
    - {'type': 'token', 'content': '...'} - Individual tokens
    - {'type': 'complete', 'message_id': '...', 'content': '...', 'session_state': '...'} - Final message
    - {'type': 'error', 'error': '...'} - Error message
    """
    return StreamingResponse(
        _stream_llm_response(
            session_id=session_id,
            user_id=user_id,
            user_message_content=data.content,
            db=db,
            session_service=session_service,
            llm_service=llm_service,
            persona_service=persona_service,
            psych_update_service=psych_update_service,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
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
    
    # If session is still None at this point, something went wrong
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
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
