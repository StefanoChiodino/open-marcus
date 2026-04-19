"""
Schemas for model management endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    """Information about an installed model."""
    name: str = Field(description="Model name/identifier")
    path: str = Field(description="Full path to model file")
    size_bytes: Optional[int] = Field(default=None, description="Model file size in bytes")
    size_human: Optional[str] = Field(default=None, description="Human-readable size")
    is_active: bool = Field(default=False, description="Whether this model is currently active")
    parameters_billions: Optional[float] = Field(default=None, description="Model size in billions of parameters")


class ModelDownloadProgress(BaseModel):
    """Progress information for model download."""
    model_name: str = Field(description="Name of the model being downloaded")
    downloaded_bytes: int = Field(description="Bytes downloaded so far")
    total_bytes: int = Field(description="Total bytes to download")
    progress_percent: float = Field(description="Download progress as percentage (0-100)")
    status: str = Field(description="Current status: downloading, completed, failed")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class ModelListResponse(BaseModel):
    """Response containing list of installed models."""
    models: List[ModelInfo] = Field(description="List of installed models")
    active_model: Optional[str] = Field(default=None, description="Currently active model name")
    models_dir: str = Field(description="Directory where models are stored")


class ModelDownloadRequest(BaseModel):
    """Request to download a model."""
    model_name: str = Field(description="HuggingFace model name to download")
    parameters_billions: Optional[float] = Field(default=None, description="Model size hint for validation")


class ModelDownloadResponse(BaseModel):
    """Response for model download request."""
    status: str = Field(description="Status: started, error")
    model_name: str = Field(description="Model name")
    message: str = Field(description="Status message")
    download_id: Optional[str] = Field(default=None, description="ID to track download progress")


class ModelActivateRequest(BaseModel):
    """Request to activate a model."""
    model_name: str = Field(description="Name of model to activate")
    verify_exists: bool = Field(default=True, description="Whether to verify model file exists")


class ModelActivateResponse(BaseModel):
    """Response for model activation."""
    success: bool = Field(description="Whether activation succeeded")
    model_name: str = Field(description="Activated model name")
    message: str = Field(description="Status message")
