"""
TTS router for text-to-speech endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response

from ..services.tts import TTSService, get_tts_service, download_voice
from ..services.jwt import jwt_service

router = APIRouter(prefix="/api/tts", tags=["tts"])
security = HTTPBearer()


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


def get_tts_service_dep() -> TTSService:
    """Dependency to get TTS service."""
    return get_tts_service()


@router.post("/synthesize")
async def synthesize_speech(
    text: str,
    voice_id: Optional[str] = None,
    tts_service: TTSService = Depends(get_tts_service_dep),
    user_id: str = Depends(get_current_user_id),
) -> Response:
    """
    Synthesize text to speech audio.
    
    Converts the provided text to audio using piper-tts.
    Returns WAV audio format.
    
    Args:
        text: Text to synthesize (max 5000 characters)
        voice_id: Optional voice ID to use. If not provided, uses user's configured voice.
        
    Returns:
        WAV audio file
    """
    if not text or len(text.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty"
        )
    
    if len(text) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text too long (max 5000 characters)"
        )
    
    # Use specified voice or default
    use_voice = voice_id if voice_id else tts_service.voice_id
    
    # Check if voice exists
    if not tts_service.check_voice_exists(use_voice):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Voice not found: {use_voice}. Please download it first."
        )
    
    # Synthesize audio
    audio_bytes = tts_service.synthesize(text, voice_id=use_voice)
    
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Speech synthesis failed"
        )
    
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": "inline",
            "X-Voice-ID": use_voice,
        }
    )


@router.get("/voices")
async def list_voices(
    tts_service: TTSService = Depends(get_tts_service_dep),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """
    List available TTS voices.
    
    Returns all available voice models, indicating which are downloaded.
    
    Returns:
        Dictionary with list of voices
    """
    voices = tts_service.get_available_voices()
    
    return {
        "voices": voices,
        "current_voice": tts_service.voice_id,
    }


@router.post("/voices/{voice_id}/download")
async def download_tts_voice(
    voice_id: str,
    tts_service: TTSService = Depends(get_tts_service_dep),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """
    Download a TTS voice model.
    
    Args:
        voice_id: Voice identifier to download (e.g., 'en_US-lessac-medium')
        
    Returns:
        Dictionary with download status
    """
    # Check if voice is in available list
    if voice_id not in tts_service.AVAILABLE_VOICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown voice: {voice_id}"
        )
    
    # Check if already downloaded
    if tts_service.check_voice_exists(voice_id):
        return {
            "status": "already_exists",
            "voice_id": voice_id,
            "message": "Voice already downloaded"
        }
    
    # Download the voice
    success = download_voice(voice_id, tts_service.voice_dir)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download voice: {voice_id}"
        )
    
    return {
        "status": "downloaded",
        "voice_id": voice_id,
        "message": "Voice downloaded successfully"
    }


@router.get("/health")
async def tts_health_check(
    tts_service: TTSService = Depends(get_tts_service_dep)
) -> dict:
    """
    Check TTS service health.
    
    Returns whether the service is ready for synthesis.
    """
    return {
        "status": "healthy" if tts_service.is_voice_loaded or tts_service.check_voice_exists() else "voice_not_loaded",
        "voice_loaded": tts_service.is_voice_loaded,
        "voice_id": tts_service.voice_id,
        "available_voices": len(tts_service.AVAILABLE_VOICES),
    }


@router.post("/load")
async def load_voice(
    voice_id: Optional[str] = None,
    tts_service: TTSService = Depends(get_tts_service_dep),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """
    Pre-load a voice model into memory.
    
    This endpoint allows pre-loading a voice for faster synthesis.
    
    Args:
        voice_id: Voice ID to load. If not provided, loads current default voice.
        
    Returns:
        Dictionary with load status
    """
    use_voice = voice_id or tts_service.voice_id
    
    if not tts_service.check_voice_exists(use_voice):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Voice not found: {use_voice}"
        )
    
    success = tts_service.load_voice(use_voice)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load voice: {use_voice}"
        )
    
    return {
        "status": "loaded",
        "voice_id": use_voice,
        "message": "Voice loaded successfully"
    }
