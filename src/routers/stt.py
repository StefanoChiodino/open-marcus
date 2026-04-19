"""
STT router for audio transcription endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..services.database import get_database_service
from ..services.stt import STTService, get_stt_service
from ..services.jwt import jwt_service

router = APIRouter(prefix="/api/stt", tags=["stt"])
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


def get_stt_service_dep() -> STTService:
    """Dependency to get STT service."""
    return get_stt_service()


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    stt_service: STTService = Depends(get_stt_service_dep),
) -> dict:
    """
    Transcribe an audio file to text.
    
    Accepts audio files (webm, wav, mp3, etc.) and returns the transcription.
    Uses faster-whisper for local transcription.
    
    Args:
        file: Audio file to transcribe
        language: Optional language code (e.g., 'en'). If not provided, auto-detects.
        
    Returns:
        Dictionary with transcribed text
    """
    content_type = file.content_type or ""
    filename = file.filename or ""
    
    # Check if it's an audio file (allow any audio type)
    if not content_type.startswith("audio/") and not any(ext in filename for ext in [".webm", ".wav", ".mp3", ".ogg", ".flac", ".m4a", ".aac"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an audio file"
        )
    
    # Read the file content
    try:
        audio_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read audio file: {str(e)}"
        )
    
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty"
        )
    
    # Limit file size (50MB)
    max_size = 50 * 1024 * 1024
    if len(audio_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file too large (max 50MB)"
        )
    
    # Transcribe the audio
    transcription = stt_service.transcribe_bytes(audio_bytes, language=language)
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed"
        )
    
    return {
        "text": transcription,
        "language": language or "auto",
    }


@router.get("/health")
async def stt_health_check(
    stt_service: STTService = Depends(get_stt_service_dep)
) -> dict:
    """
    Check STT service health.
    
    Returns whether the service is ready for transcription.
    """
    return {
        "status": "healthy" if stt_service.is_model_loaded or stt_service.check_model_exists() else "model_not_loaded",
        "model_loaded": stt_service.is_model_loaded,
        "model_size": stt_service.model_size,
    }
