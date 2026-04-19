"""
Schemas for settings endpoints.
"""

from typing import Optional
from pydantic import BaseModel, Field


class SettingsUpdate(BaseModel):
    """Request model for updating settings."""
    selected_model: Optional[str] = Field(default=None, max_length=255)
    tts_voice: Optional[str] = Field(default=None, max_length=100)
    tts_speed: Optional[float] = Field(default=None, ge=0.5, le=2.0)
    stt_enabled: Optional[bool] = None
    theme: Optional[str] = Field(default=None, max_length=20)


class SettingsResponse(BaseModel):
    """Response model for settings data."""
    id: str
    user_id: str
    selected_model: Optional[str]
    tts_voice: str
    tts_speed: float
    stt_enabled: bool
    ram_detected: Optional[float]
    theme: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class SystemInfo(BaseModel):
    """Response model for system information."""
    ram_total_gb: float
    ram_detected_gb: Optional[float] = None
