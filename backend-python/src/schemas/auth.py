"""
Schemas for authentication endpoints.
"""

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """Request model for user registration."""
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    """Request model for user login."""
    username: str
    password: str


class UserResponse(BaseModel):
    """Response model for user data (without password)."""
    id: str
    username: str
    created_at: str
    
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response model for authentication token."""
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Generic message response model."""
    message: str
