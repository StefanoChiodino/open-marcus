"""
SemanticAssertion model for facts extracted about the user.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base

if TYPE_CHECKING:
    from .psych_update import PsychUpdate


class SemanticAssertion(Base):
    """A fact about the user extracted from conversation."""
    
    __tablename__ = "semantic_assertions"
    
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
    source_message_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True
    )
    psych_update_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("psych_updates.id", ondelete="CASCADE"),
        nullable=True
    )
    text: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.5
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )  # e.g., "goal", "pattern", "belief", "preference"
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="semantic_assertions")
    psych_update: Mapped[Optional["PsychUpdate"]] = relationship(
        "PsychUpdate",
        back_populates="semantic_assertions"
    )
    
    def __repr__(self) -> str:
        return f"<SemanticAssertion(id={self.id}, text={self.text[:50]}...)>"
