"""
Schemas for profile endpoints.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    """Request model for creating a profile."""
    name: str = Field(min_length=1, max_length=255)
    goals: str = Field(default="")
    experience_level: str = Field(default="beginner")


class ProfileUpdate(BaseModel):
    """Request model for updating a profile."""
    name: str = Field(min_length=1, max_length=255)
    goals: str = Field(default="")
    experience_level: str = Field(default="beginner")


class ProfileResponse(BaseModel):
    """Response model for profile data."""
    id: str
    user_id: str
    name: str
    goals: str
    experience_level: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}
