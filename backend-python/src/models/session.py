"""
Session model for meditation sessions.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Session(Base):
    """A meditation session with state machine (intro -> active -> concluded)."""
    
    __tablename__ = "sessions"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="intro"
    )
    summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        onupdate=datetime.utcnow,
        nullable=True
    )
    concluded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    
    def __repr__(self) -> str:
        return f"<Session(id={self.id}, state={self.state}, user_id={self.user_id})>"
