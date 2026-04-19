"""
Profile model for user profile information.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Profile(Base):
    """User profile with meditation goals and experience."""
    
    __tablename__ = "profiles"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    goals: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=""
    )
    experience_level: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="beginner"
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
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
    
    def __repr__(self) -> str:
        return f"<Profile(id={self.id}, name={self.name}, user_id={self.user_id})>"
