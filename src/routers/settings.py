"""
Settings router for FastAPI.
"""

import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..schemas.settings import SettingsUpdate, SettingsResponse, SystemInfo, ModelRecommendationSchema
from ..services.database import get_database_service
from ..models.settings import Settings
from ..models.user import User
from ..models.profile import Profile
from ..models.session import Session as SessionModel
from ..models.message import Message
from ..models.psych_update import PsychUpdate
from ..models.semantic_assertion import SemanticAssertion
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


@router.post("/export")
async def export_data(
    format: str = Query("json", description="Export format: 'json' or 'sqlite'"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Export all user data as JSON or SQLite backup.
    
    - **format**: Export format - 'json' (full data export) or 'sqlite' (database backup)
    
    Returns a downloadable file with all user data.
    """
    if format not in ("json", "sqlite"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format. Must be 'json' or 'sqlite'"
        )
    
    if format == "sqlite":
        # Return SQLite database backup
        db_service = get_database_service()
        db_path = db_service.get_database_file_path()
        
        if db_path is None or not db_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database file not found"
            )
        
        # Create a copy for export
        import tempfile
        temp_dir = tempfile.mkdtemp()
        temp_db_path = Path(temp_dir) / "openMarcus_backup.db"
        shutil.copy2(db_path, temp_db_path)
        
        return FileResponse(
            path=temp_db_path,
            filename="openMarcus_backup.db",
            media_type="application/x-sqlite3"
        )
    
    # JSON export - gather all user data
    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "app_version": "0.1.0",
        "user": None,
        "profile": None,
        "settings": None,
        "sessions": [],
        "memories": {
            "psych_updates": [],
            "semantic_assertions": []
        }
    }
    
    # Get user info (without password hash)
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        export_data["user"] = {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    
    # Get profile
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        export_data["profile"] = {
            "id": profile.id,
            "name": profile.name,
            "goals": profile.goals,
            "experience_level": profile.experience_level,
            "created_at": profile.created_at.isoformat() if profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
        }
    
    # Get settings
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if settings:
        export_data["settings"] = {
            "id": settings.id,
            "selected_model": settings.selected_model,
            "tts_voice": settings.tts_voice,
            "tts_speed": settings.tts_speed,
            "stt_enabled": settings.stt_enabled,
            "ram_detected": settings.ram_detected,
            "theme": settings.theme,
            "created_at": settings.created_at.isoformat() if settings.created_at else None,
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
        }
    
    # Get sessions with messages
    sessions = db.query(SessionModel).filter(SessionModel.user_id == user_id).order_by(SessionModel.created_at.desc()).all()
    for session in sessions:
        session_data = {
            "id": session.id,
            "state": session.state,
            "summary": session.summary,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
            "concluded_at": session.concluded_at.isoformat() if session.concluded_at else None,
            "messages": []
        }
        
        # Get messages for this session
        messages = db.query(Message).filter(Message.session_id == session.id).order_by(Message.created_at).all()
        for msg in messages:
            msg_data = {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "psych_update": None
            }
            
            # Get psych_update for this message
            psych_update = db.query(PsychUpdate).filter(PsychUpdate.message_id == msg.id).first()
            if psych_update:
                msg_data["psych_update"] = {
                    "id": psych_update.id,
                    "detected_patterns": psych_update.detected_patterns,
                    "emotional_state": psych_update.emotional_state,
                    "stoic_principle_applied": psych_update.stoic_principle_applied,
                    "suggested_direction": psych_update.suggested_direction,
                    "confidence": psych_update.confidence,
                    "created_at": psych_update.created_at.isoformat() if psych_update.created_at else None
                }
            
            session_data["messages"].append(msg_data)
        
        export_data["sessions"].append(session_data)
    
    # Get semantic assertions
    assertions = db.query(SemanticAssertion).filter(SemanticAssertion.user_id == user_id).order_by(SemanticAssertion.created_at.desc()).all()
    for assertion in assertions:
        export_data["memories"]["semantic_assertions"].append({
            "id": assertion.id,
            "text": assertion.text,
            "confidence": assertion.confidence,
            "category": assertion.category,
            "created_at": assertion.created_at.isoformat() if assertion.created_at else None
        })
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": "attachment; filename=openMarcus_export.json"
        }
    )


@router.delete("/clear-data")
async def clear_all_data(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Clear all user data from the database.
    This will delete the user account and all associated data.
    """
    # Delete in order: messages, sessions, psych_updates, semantic_assertions, profile, settings, user
    
    # Get user's sessions and delete their messages
    sessions = db.query(SessionModel).filter(SessionModel.user_id == user_id).all()
    for session in sessions:
        # Delete messages for this session
        db.query(Message).filter(Message.session_id == session.id).delete()
    # Delete sessions
    db.query(SessionModel).filter(SessionModel.user_id == user_id).delete()
    
    # Delete psych_updates (through messages that are already deleted, but be thorough)
    # First get all message IDs for user's sessions
    message_ids = [m.id for m in db.query(Message.id).filter(Message.session_id.in_([s.id for s in sessions])).all()]
    if message_ids:
        db.query(PsychUpdate).filter(PsychUpdate.message_id.in_(message_ids)).delete()
    
    # Delete semantic assertions
    db.query(SemanticAssertion).filter(SemanticAssertion.user_id == user_id).delete()
    
    # Delete profile
    db.query(Profile).filter(Profile.user_id == user_id).delete()
    
    # Delete settings
    db.query(Settings).filter(Settings.user_id == user_id).delete()
    
    # Delete user
    db.query(User).filter(User.id == user_id).delete()
    
    db.commit()
    
    return {"message": "All user data has been cleared"}
