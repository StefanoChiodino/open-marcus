"""
Model management service.

Handles listing installed models, downloading new GGUF models from HuggingFace,
and managing model activation/switching.
"""

import logging
from pathlib import Path
from typing import Optional, List, Dict, AsyncIterator
from dataclasses import dataclass

logger = logging.getLogger(__name__)


# Default model directory
DEFAULT_MODEL_DIR = Path.home() / ".openmarcus" / "models"


@dataclass
class DownloadProgress:
    """Progress of a model download."""
    model_name: str
    downloaded_bytes: int
    total_bytes: int
    status: str  # "downloading", "completed", "failed"
    error: Optional[str] = None
    
    @property
    def progress_percent(self) -> float:
        if self.total_bytes == 0:
            return 0.0
        return (self.downloaded_bytes / self.total_bytes) * 100


class ModelManagementService:
    """
    Service for managing GGUF models.
    
    Features:
    - List installed models
    - Download models from HuggingFace
    - Track download progress
    - Switch active model
    - Model file validation
    """
    
    def __init__(self, models_dir: Optional[Path] = None):
        """
        Initialize the model management service.
        
        Args:
            models_dir: Directory to store models. Defaults to ~/.openmarcus/models
        """
        self.models_dir = models_dir or DEFAULT_MODEL_DIR
        self._ensure_models_dir()
        
        # Active downloads tracking
        self._active_downloads: Dict[str, DownloadProgress] = {}
    
    def _ensure_models_dir(self) -> None:
        """Ensure the models directory exists."""
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_model_size_human(self, path: Path) -> Optional[str]:
        """Get human-readable size of a file."""
        try:
            size_bytes = path.stat().st_size
            if size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
            else:
                return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
        except Exception:
            return None
    
    def _get_parameters_from_filename(self, filename: str) -> Optional[float]:
        """Extract parameter count from model filename."""
        import re
        # Look for patterns like "7b", "3b", "14b" etc
        match = re.search(r'(\d+(?:\.\d+)?)[Bb]', filename, re.IGNORECASE)
        if match:
            value = match.group(1)
            return float(value) if '.' in value else int(value)
        return None
    
    def list_installed_models(self, active_model: Optional[str] = None) -> List[Dict]:
        """
        List all installed GGUF models.
        
        Args:
            active_model: Name of the currently active model (to mark it)
            
        Returns:
            List of model info dicts
        """
        models: List[Dict] = []
        
        if not self.models_dir.exists():
            return models
        
        for model_path in self.models_dir.glob("*.gguf"):
            size_human = self._get_model_size_human(model_path)
            size_bytes = model_path.stat().st_size if model_path.exists() else None
            params = self._get_parameters_from_filename(model_path.name)
            
            # Check if this is the active model
            is_active = (
                active_model is not None and 
                model_path.name == active_model
            ) or (
                active_model is None and 
                model_path.name.endswith("-active.gguf")
            )
            
            models.append({
                "name": model_path.name,
                "path": str(model_path),
                "size_bytes": size_bytes,
                "size_human": size_human,
                "is_active": is_active,
                "parameters_billions": params,
            })
        
        # Sort by name
        models.sort(key=lambda m: str(m["name"]))
        return models
    
    def get_model_path(self, model_name: str) -> Path:
        """Get full path for a model by name."""
        return self.models_dir / model_name
    
    def check_model_exists(self, model_name: str) -> bool:
        """Check if a model exists in the models directory."""
        return self.get_model_path(model_name).exists()
    
    def get_download_progress(self, model_name: str) -> Optional[DownloadProgress]:
        """Get download progress for a model."""
        return self._active_downloads.get(model_name)
    
    async def download_model(
        self, 
        model_name: str, 
        huggingface_repo: Optional[str] = None
    ) -> AsyncIterator[DownloadProgress]:
        """
        Download a GGUF model from HuggingFace.
        
        Args:
            model_name: Name for the downloaded model file
            huggingface_repo: HuggingFace repo ID (e.g., "Qwen/Qwen2.5-7B-Instruct-GGUF")
                            If None, uses model_name as the HF repo
        
        Yields:
            DownloadProgress objects with download status
        """
        from huggingface_hub import hf_hub_download
        
        if self.check_model_exists(model_name):
            progress = DownloadProgress(
                model_name=model_name,
                downloaded_bytes=0,
                total_bytes=0,
                status="failed",
                error=f"Model {model_name} already exists"
            )
            yield progress
            return
        
        # Track this download
        self._active_downloads[model_name] = DownloadProgress(
            model_name=model_name,
            downloaded_bytes=0,
            total_bytes=0,
            status="starting"
        )
        
        try:
            # Normalize model name to find the right GGUF file
            # Many HF repos have multiple GGUF files, we need the main one
            repo_id = huggingface_repo or model_name
            
            # Find the appropriate GGUF file
            # For Qwen models, typically the biggest Q5_K_M or similar is recommended
            # We'll look for the largest file that fits naming convention
            logger.info(f"Downloading model {model_name} from HuggingFace repo {repo_id}")
            
            # Use hf_hub_download to get the model file
            # The model file selection depends on the repo structure
            filename_arg: str = model_name if model_name.endswith('.gguf') else model_name + ".gguf"
            local_path = hf_hub_download(
                repo_id=repo_id,
                filename=filename_arg,
                local_dir=self.models_dir,
            )
            
            # Verify download
            if Path(local_path).exists():
                file_size = Path(local_path).stat().st_size
                self._active_downloads[model_name] = DownloadProgress(
                    model_name=model_name,
                    downloaded_bytes=file_size,
                    total_bytes=file_size,
                    status="completed"
                )
                yield self._active_downloads[model_name]
            else:
                self._active_downloads[model_name] = DownloadProgress(
                    model_name=model_name,
                    downloaded_bytes=0,
                    total_bytes=0,
                    status="failed",
                    error="Download failed - file not found after download"
                )
                yield self._active_downloads[model_name]
                
        except Exception as e:
            logger.error(f"Model download failed: {e}")
            self._active_downloads[model_name] = DownloadProgress(
                model_name=model_name,
                downloaded_bytes=0,
                total_bytes=0,
                status="failed",
                error=str(e)
            )
            yield self._active_downloads[model_name]
    
    def delete_model(self, model_name: str) -> bool:
        """
        Delete a model file.
        
        Args:
            model_name: Name of the model to delete
            
        Returns:
            True if deleted, False if not found or error
        """
        model_path = self.get_model_path(model_name)
        if not model_path.exists():
            return False
        
        try:
            model_path.unlink()
            logger.info(f"Deleted model {model_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {e}")
            return False
    
    def get_models_dir(self) -> Path:
        """Get the models directory path."""
        return self.models_dir


# Global instance
_model_management_service: Optional[ModelManagementService] = None


def get_model_management_service() -> ModelManagementService:
    """Get the global model management service instance."""
    global _model_management_service
    if _model_management_service is None:
        _model_management_service = ModelManagementService()
    return _model_management_service


def set_model_management_service(service: ModelManagementService) -> None:
    """Set a custom model management service instance."""
    global _model_management_service
    _model_management_service = service
