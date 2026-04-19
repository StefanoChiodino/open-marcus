"""
Settings router for FastAPI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime

from ..schemas.settings import SettingsUpdate, SettingsResponse, SystemInfo, ModelRecommendationSchema
from ..services.database import get_database_service
from ..models.settings import Settings
from ..services.jwt import jwt_service
from ..services.ram_detection import (
    get_total_ram_gb,
    get_ram_detection_service,
)


router = APIRouter(prefix="/api/settings", tags=["settings"])
security = HTTPBearer()


def get_db() -> Session:
    """Dependency to get database session."""
    db_service = get_database_service()
    return db_service.get_session()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and validate user ID from JWT token."""
    token = credentials.credentials
    user_id = jwt_service.get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_id


def get_system_ram_gb() -> float:
    """Get total system RAM in GB."""
    # Use the new RAM detection service
    return get_total_ram_gb()


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> SettingsResponse:
    """
    Get the current user's settings.
    Creates default settings if none exist.
    """
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    
    if settings is None:
        # Create default settings
        ram_detected = get_system_ram_gb()
        settings = Settings(
            user_id=user_id,
            tts_voice="en_US-lessac-medium",
            tts_speed=1.0,
            stt_enabled=True,
            ram_detected=ram_detected,
            theme="light",
            created_at=datetime.utcnow()
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return SettingsResponse(
        id=settings.id,
        user_id=settings.user_id,
        selected_model=settings.selected_model,
        tts_voice=settings.tts_voice,
        tts_speed=settings.tts_speed,
        stt_enabled=settings.stt_enabled,
        ram_detected=settings.ram_detected,
        theme=settings.theme,
        created_at=settings.created_at.isoformat() if settings.created_at else "",
        updated_at=settings.updated_at.isoformat() if settings.updated_at else None
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> SettingsResponse:
    """
    Update the current user's settings.
    """
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    
    if settings is None:
        # Create settings with provided values
        ram_detected = get_system_ram_gb()
        settings = Settings(
            user_id=user_id,
            ram_detected=ram_detected,
            created_at=datetime.utcnow()
        )
        db.add(settings)
    
    # Update only provided fields
    if data.selected_model is not None:
        settings.selected_model = data.selected_model
    if data.tts_voice is not None:
        settings.tts_voice = data.tts_voice
    if data.tts_speed is not None:
        settings.tts_speed = data.tts_speed
    if data.stt_enabled is not None:
        settings.stt_enabled = data.stt_enabled
    if data.theme is not None:
        settings.theme = data.theme
    
    settings.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(settings)
    
    return SettingsResponse(
        id=settings.id,
        user_id=settings.user_id,
        selected_model=settings.selected_model,
        tts_voice=settings.tts_voice,
        tts_speed=settings.tts_speed,
        stt_enabled=settings.stt_enabled,
        ram_detected=settings.ram_detected,
        theme=settings.theme,
        created_at=settings.created_at.isoformat() if settings.created_at else "",
        updated_at=settings.updated_at.isoformat() if settings.updated_at else None
    )


@router.get("/system", response_model=SystemInfo)
async def get_system_info() -> SystemInfo:
    """
    Get system information including RAM and model recommendations.
    This endpoint does not require authentication.
    
    Returns total RAM and recommended GGUF models based on available memory.
    """
    ram_service = get_ram_detection_service()
    ram_total = ram_service.detect()
    recommendations = ram_service.recommendations
    
    # Convert to schema
    model_recommendations = [
        ModelRecommendationSchema(
            name=rec.name,
            parameters_billions=rec.parameters_billions,
            min_ram_gb=rec.min_ram_gb,
            description=rec.description,
            suggested=rec.suggested,
        )
        for rec in recommendations
    ]
    
    return SystemInfo(
        ram_total_gb=round(ram_total, 2),
        ram_detected_gb=round(ram_total, 2),
        model_recommendations=model_recommendations,
    )
