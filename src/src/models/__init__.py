"""
Database models for OpenMarcus.

This module exports all SQLAlchemy models used by the application.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


from .user import User
from .profile import Profile
from .session import Session
from .message import Message
from .psych_update import PsychUpdate
from .semantic_assertion import SemanticAssertion
from .settings import Settings


__all__ = [
    "Base",
    "User",
    "Profile",
    "Session",
    "Message",
    "PsychUpdate",
    "SemanticAssertion",
    "Settings",
]
