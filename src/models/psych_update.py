"""
PsychUpdate model for psychological analysis after AI responses.
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
import uuid

from sqlalchemy import String, DateTime, Text, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .message import Message
    from .semantic_assertion import SemanticAssertion


class PsychUpdate(Base):
    """Psychological analysis after each AI response."""
    
    __tablename__ = "psych_updates"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    message_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("messages.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    detected_patterns: Mapped[List] = mapped_column(
        JSON,
        nullable=False,
        default=list
    )
    emotional_state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="unknown"
    )
    stoic_principle_applied: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    suggested_direction: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.5
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    # Relationships - use string reference to avoid circular import
    message: Mapped[Optional["Message"]] = relationship(
        "Message",
        back_populates="psych_update",
        foreign_keys=[message_id],
        overlaps="psych_update"
    )
    semantic_assertions: Mapped[List["SemanticAssertion"]] = relationship(
        "SemanticAssertion",
        back_populates="psych_update",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<PsychUpdate(id={self.id}, emotional_state={self.emotional_state})>"
