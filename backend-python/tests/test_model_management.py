"""
Tests for model management service and endpoints.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

from src.services.model_management import (
    ModelManagementService,
    DownloadProgress,
    get_model_management_service,
    set_model_management_service,
    DEFAULT_MODEL_DIR,
)


class TestModelManagementService:
    """Tests for ModelManagementService class."""
    
    def test_initialization_default_dir(self):
        """Test service initializes with default model directory."""
        service = ModelManagementService()
        assert service.models_dir == DEFAULT_MODEL_DIR
    
    def test_initialization_custom_dir(self, tmp_path):
        """Test service initializes with custom model directory."""
        custom_dir = tmp_path / "custom_models"
        service = ModelManagementService(models_dir=custom_dir)
        assert service.models_dir == custom_dir
    
    def test_get_model_path(self, tmp_path):
        """Test getting full path for a model name."""
        service = ModelManagementService(models_dir=tmp_path)
        model_path = service.get_model_path("test-model.gguf")
        assert model_path == tmp_path / "test-model.gguf"
    
    def test_check_model_exists_false(self, tmp_path):
        """Test model doesn't exist initially."""
        service = ModelManagementService(models_dir=tmp_path)
        assert service.check_model_exists("nonexistent.gguf") is False
    
    def test_check_model_exists_true(self, tmp_path):
        """Test model exists after creating file."""
        service = ModelManagementService(models_dir=tmp_path)
        model_file = tmp_path / "test.gguf"
        model_file.touch()
        assert service.check_model_exists("test.gguf") is True
    
    def test_delete_model_success(self, tmp_path):
        """Test deleting a model file."""
        service = ModelManagementService(models_dir=tmp_path)
        model_file = tmp_path / "test.gguf"
        model_file.touch()
        assert model_file.exists()
        
        result = service.delete_model("test.gguf")
        assert result is True
        assert not model_file.exists()
    
    def test_delete_model_not_found(self, tmp_path):
        """Test deleting a non-existent model."""
        service = ModelManagementService(models_dir=tmp_path)
        result = service.delete_model("nonexistent.gguf")
        assert result is False
    
    def test_get_models_dir(self, tmp_path):
        """Test getting models directory."""
        service = ModelManagementService(models_dir=tmp_path)
        assert service.get_models_dir() == tmp_path
    
    def test_ensure_models_dir_creates_directory(self, tmp_path):
        """Test that models dir is created if it doesn't exist."""
        new_dir = tmp_path / "new_models"
        # Constructor creates the dir immediately, so first verify it exists
        service = ModelManagementService(models_dir=new_dir)
        assert new_dir.exists()


class TestListInstalledModels:
    """Tests for listing installed models."""
    
    def test_list_models_empty_directory(self, tmp_path):
        """Test listing when no models exist."""
        service = ModelManagementService(models_dir=tmp_path)
        models = service.list_installed_models()
        assert models == []
    
    def test_list_models_finds_gguf_files(self, tmp_path):
        """Test listing finds GGUF files."""
        service = ModelManagementService(models_dir=tmp_path)
        (tmp_path / "model1.gguf").touch()
        (tmp_path / "model2.gguf").touch()
        (tmp_path / "readme.txt").touch()  # Non-GGUF file
        
        models = service.list_installed_models()
        assert len(models) == 2
        model_names = [m["name"] for m in models]
        assert "model1.gguf" in model_names
        assert "model2.gguf" in model_names
    
    def test_list_models_marks_active(self, tmp_path):
        """Test that active model is marked."""
        service = ModelManagementService(models_dir=tmp_path)
        (tmp_path / "active-model.gguf").touch()
        (tmp_path / "other-model.gguf").touch()
        
        models = service.list_installed_models(active_model="active-model.gguf")
        active_models = [m for m in models if m["is_active"]]
        assert len(active_models) == 1
        assert active_models[0]["name"] == "active-model.gguf"
    
    def test_list_models_extracts_parameters(self, tmp_path):
        """Test that parameter count is extracted from filename."""
        service = ModelManagementService(models_dir=tmp_path)
        (tmp_path / "Qwen2.5-7B-Instruct.gguf").touch()
        
        models = service.list_installed_models()
        assert len(models) == 1
        assert models[0]["parameters_billions"] == 7.0
    
    def test_list_models_extracts_parameters_1_5b(self, tmp_path):
        """Test that 1.5B parameter extraction works."""
        service = ModelManagementService(models_dir=tmp_path)
        (tmp_path / "Qwen2.5-1.5B-Instruct.gguf").touch()
        
        models = service.list_installed_models()
        assert len(models) == 1
        assert models[0]["parameters_billions"] == 1.5
    
    def test_list_models_sorted_by_name(self, tmp_path):
        """Test that models are sorted alphabetically."""
        service = ModelManagementService(models_dir=tmp_path)
        (tmp_path / "zzz-model.gguf").touch()
        (tmp_path / "aaa-model.gguf").touch()
        (tmp_path / "mmm-model.gguf").touch()
        
        models = service.list_installed_models()
        names = [m["name"] for m in models]
        assert names == sorted(names)


class TestDownloadProgress:
    """Tests for DownloadProgress dataclass."""
    
    def test_progress_percent_calculation(self):
        """Test progress percentage calculation."""
        progress = DownloadProgress(
            model_name="test.gguf",
            downloaded_bytes=500,
            total_bytes=1000,
            status="downloading"
        )
        assert progress.progress_percent == 50.0
    
    def test_progress_percent_zero_total(self):
        """Test progress with zero total bytes."""
        progress = DownloadProgress(
            model_name="test.gguf",
            downloaded_bytes=100,
            total_bytes=0,
            status="downloading"
        )
        assert progress.progress_percent == 0.0


class TestGlobalInstance:
    """Tests for global service instance management."""
    
    def test_get_model_management_service_returns_instance(self):
        """Test getting global service instance."""
        service = get_model_management_service()
        assert service is not None
        assert isinstance(service, ModelManagementService)
    
    def test_set_model_management_service_replaces_instance(self, tmp_path):
        """Test that setting new service replaces global instance."""
        new_service = ModelManagementService(models_dir=tmp_path)
        set_model_management_service(new_service)
        assert get_model_management_service() is new_service


class TestGetModelSizeHuman:
    """Tests for human-readable size calculation."""
    
    def test_kb_size(self, tmp_path):
        """Test KB size formatting for small files."""
        service = ModelManagementService(models_dir=tmp_path)
        file_path = tmp_path / "small.bin"
        file_path.write_bytes(b"x" * 512)  # ~0.5 KB
        
        size_human = service._get_model_size_human(file_path)
        assert size_human is not None
        assert "KB" in size_human
    
    def test_mb_size(self, tmp_path):
        """Test MB size formatting."""
        service = ModelManagementService(models_dir=tmp_path)
        file_path = tmp_path / "medium.bin"
        # Create ~1.5 MB file
        file_path.write_bytes(b"x" * (1024 * 1024 + 512 * 1024))
        
        size_human = service._get_model_size_human(file_path)
        assert size_human is not None
        assert "MB" in size_human
    
    def test_gb_size(self, tmp_path):
        """Test GB size formatting."""
        service = ModelManagementService(models_dir=tmp_path)
        file_path = tmp_path / "large.bin"
        # Create ~2.5 GB file (in bytes)
        file_path.write_bytes(b"x" * (1024 * 1024 * 1024 * 2 + 512 * 1024 * 1024))
        
        size_human = service._get_model_size_human(file_path)
        assert size_human is not None
        assert "GB" in size_human


class TestGetParametersFromFilename:
    """Tests for parameter extraction from filenames."""
    
    def test_extract_7b(self):
        """Test extracting 7B from filename."""
        service = ModelManagementService()
        assert service._get_parameters_from_filename("Qwen2.5-7B-Instruct.gguf") == 7.0
    
    def test_extract_1_5b(self):
        """Test extracting 1.5B from filename."""
        service = ModelManagementService()
        assert service._get_parameters_from_filename("Qwen2.5-1.5B.gguf") == 1.5
    
    def test_extract_14b(self):
        """Test extracting 14B from filename."""
        service = ModelManagementService()
        assert service._get_parameters_from_filename("model-14b-Q5_K_M.gguf") == 14.0
    
    def test_extract_no_match(self):
        """Test filename with no parameter pattern."""
        service = ModelManagementService()
        assert service._get_parameters_from_filename("unknown-model.gguf") is None


class TestActiveDownloadsTracking:
    """Tests for active download tracking."""
    
    def test_get_download_progress_not_started(self):
        """Test getting progress for non-existent download."""
        service = ModelManagementService()
        progress = service.get_download_progress("nonexistent.gguf")
        assert progress is None
    
    def test_set_and_get_download_progress(self):
        """Test setting and getting download progress."""
        service = ModelManagementService()
        progress = DownloadProgress(
            model_name="test.gguf",
            downloaded_bytes=100,
            total_bytes=1000,
            status="downloading"
        )
        service._active_downloads["test.gguf"] = progress
        
        retrieved = service.get_download_progress("test.gguf")
        assert retrieved is not None
        assert retrieved.downloaded_bytes == 100
        assert retrieved.status == "downloading"
