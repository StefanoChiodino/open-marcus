"""
Settings model for user preferences.
"""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class Settings(Base):
    """User settings and preferences."""
    
    __tablename__ = "settings"
    
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
    selected_model: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    tts_voice: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="en_US-lessac-medium"
    )
    tts_speed: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0
    )
    stt_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )
    ram_detected: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True
    )
    theme: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="light"
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
    user: Mapped["User"] = relationship("User", back_populates="settings")
    
    def __repr__(self) -> str:
        return f"<Settings(user_id={self.user_id}, model={self.selected_model})>"
