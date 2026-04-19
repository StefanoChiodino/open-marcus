"""
Schemas for session endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """Response model for a message."""
    id: str
    session_id: str
    role: str
    content: str
    created_at: str

    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    """Request model for creating a session."""
    pass  # No fields needed - session created for current user


class SessionUpdate(BaseModel):
    """Request model for updating a session."""
    summary: Optional[str] = None


class SessionResponse(BaseModel):
    """Response model for session data."""
    id: str
    user_id: str
    state: str
    summary: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    concluded_at: Optional[str] = None

    model_config = {"from_attributes": True}


class SessionDetailResponse(BaseModel):
    """Response model for session with messages."""
    id: str
    user_id: str
    state: str
    summary: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    concluded_at: Optional[str] = None
    messages: List[MessageResponse] = []

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    """Response model for session list."""
    sessions: List[SessionResponse]


class SessionStateResponse(BaseModel):
    """Response model for session state change."""
    id: str
    state: str
    message: str


class MessageCreate(BaseModel):
    """Request model for creating a message."""
    content: str = Field(min_length=1)


class MessageAddResponse(BaseModel):
    """Response model for adding a message to a session."""
    id: str
    session_id: str
    role: str
    content: str
    created_at: str
    session_state: str

    model_config = {"from_attributes": True}
