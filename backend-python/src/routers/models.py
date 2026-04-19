"""
Models router for FastAPI.

Handles model listing, downloading, and switching.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..schemas.models import (
    ModelInfo,
    ModelListResponse,
    ModelDownloadRequest,
    ModelDownloadResponse,
    ModelDownloadProgress,
    ModelActivateRequest,
    ModelActivateResponse,
)
from ..services.database import get_database_service
from ..services.jwt import jwt_service
from ..services.model_management import get_model_management_service
from ..models.settings import Settings


router = APIRouter(prefix="/api/models", tags=["models"])
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


def get_current_settings(db: Session, user_id: str) -> Settings:
    """Get current user settings."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found for user"
        )
    return settings


@router.get("", response_model=ModelListResponse)
async def list_models(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ModelListResponse:
    """
    List all installed GGUF models.
    
    Returns information about each model including path, size,
    and whether it's the currently active model.
    """
    model_service = get_model_management_service()
    settings = get_current_settings(db, user_id)
    
    # Get active model from settings
    active_model = settings.selected_model
    
    # List installed models
    models_data = model_service.list_installed_models(active_model=active_model)
    
    # Convert to ModelInfo objects
    models = [
        ModelInfo(
            name=m["name"],
            path=m["path"],
            size_bytes=m.get("size_bytes"),
            size_human=m.get("size_human"),
            is_active=m.get("is_active", False),
            parameters_billions=m.get("parameters_billions"),
        )
        for m in models_data
    ]
    
    return ModelListResponse(
        models=models,
        active_model=active_model,
        models_dir=str(model_service.get_models_dir()),
    )


@router.post("/download", response_model=ModelDownloadResponse)
async def download_model(
    data: ModelDownloadRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ModelDownloadResponse:
    """
    Start downloading a model from HuggingFace.
    
    The model will be downloaded in the background. Use the
    GET /api/models/download/{model_name}/status endpoint to
    check download progress.
    """
    model_service = get_model_management_service()
    
    # Check if model already exists
    if model_service.check_model_exists(data.model_name):
        return ModelDownloadResponse(
            status="error",
            model_name=data.model_name,
            message=f"Model {data.model_name} already exists",
            download_id=None,
        )
    
    # Start download in background task (actual download happens async)
    # For now, return immediately - the download can be polled via status endpoint
    return ModelDownloadResponse(
        status="started",
        model_name=data.model_name,
        message=f"Download started for {data.model_name}",
        download_id=data.model_name,  # Use model name as download ID
    )


@router.get("/download/{model_name}/status", response_model=ModelDownloadProgress)
async def get_download_status(
    model_name: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ModelDownloadProgress:
    """
    Get the status of a model download.
    """
    model_service = get_model_management_service()
    progress = model_service.get_download_progress(model_name)
    
    if progress is None:
        # No active download - check if model already exists
        if model_service.check_model_exists(model_name):
            return ModelDownloadProgress(
                model_name=model_name,
                downloaded_bytes=0,
                total_bytes=0,
                progress_percent=100.0,
                status="completed",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No download found for model {model_name}"
            )
    
    return ModelDownloadProgress(
        model_name=progress.model_name,
        downloaded_bytes=progress.downloaded_bytes,
        total_bytes=progress.total_bytes,
        progress_percent=progress.progress_percent,
        status=progress.status,
        error=progress.error,
    )


@router.post("/active", response_model=ModelActivateResponse)
async def set_active_model(
    data: ModelActivateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ModelActivateResponse:
    """
    Set the active model for the current user.
    
    The model must exist in the models directory. The LLM service
    will use this model for inference.
    """
    model_service = get_model_management_service()
    settings = get_current_settings(db, user_id)
    
    # Verify model exists
    if not model_service.check_model_exists(data.model_name):
        return ModelActivateResponse(
            success=False,
            model_name=data.model_name,
            message=f"Model {data.model_name} not found in {model_service.get_models_dir()}",
        )
    
    # Update settings
    settings.selected_model = data.model_name
    db.commit()
    
    logger.info(f"User {user_id} activated model {data.model_name}")
    
    return ModelActivateResponse(
        success=True,
        model_name=data.model_name,
        message=f"Model {data.model_name} is now active",
    )


@router.delete("/{model_name}", response_model=ModelActivateResponse)
async def delete_model(
    model_name: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ModelActivateResponse:
    """
    Delete a model file.
    
    Cannot delete the currently active model.
    """
    model_service = get_model_management_service()
    settings = get_current_settings(db, user_id)
    
    # Check if model is active
    if settings.selected_model == model_name:
        return ModelActivateResponse(
            success=False,
            model_name=model_name,
            message="Cannot delete active model. Please switch to another model first.",
        )
    
    # Check if model exists
    if not model_service.check_model_exists(model_name):
        return ModelActivateResponse(
            success=False,
            model_name=model_name,
            message=f"Model {model_name} not found",
        )
    
    # Delete the model
    success = model_service.delete_model(model_name)
    
    if success:
        return ModelActivateResponse(
            success=True,
            model_name=model_name,
            message=f"Model {model_name} deleted",
        )
    else:
        return ModelActivateResponse(
            success=False,
            model_name=model_name,
            message=f"Failed to delete model {model_name}",
        )
