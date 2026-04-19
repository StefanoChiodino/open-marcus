"""
Tests for STT Service using faster-whisper.
"""

import pytest
from unittest.mock import MagicMock, patch
from src.services.stt import STTService, MockSTTService, get_stt_service


class TestSTTServiceImports:
    """Test that STT service can be imported correctly."""

    def test_stt_service_imports_successfully(self):
        """Test STT service class can be imported."""
        from src.services.stt import STTService
        assert STTService is not None

    def test_mock_stt_service_imports_successfully(self):
        """Test MockSTT service class can be imported."""
        from src.services.stt import MockSTTService
        assert MockSTTService is not None


class TestSTTServiceStructure:
    """Tests for STT service class structure."""

    def test_stt_service_has_required_attributes(self):
        """Test STTService initializes with required attributes."""
        service = STTService()
        
        assert hasattr(service, 'model_size')
        assert hasattr(service, 'model_dir')
        assert hasattr(service, 'device')
        assert hasattr(service, 'compute_type')
        assert hasattr(service, '_model')
        
    def test_mock_stt_service_has_required_attributes(self):
        """Test MockSTTService initializes with required attributes."""
        service = MockSTTService()
        
        assert hasattr(service, 'model_size')
        assert hasattr(service, 'model_dir')
        assert hasattr(service, 'device')
        assert hasattr(service, 'compute_type')
        assert hasattr(service, '_model')

    def test_stt_service_default_values(self):
        """Test STTService default values."""
        service = STTService()
        
        assert service.model_size == "base"
        assert service._model is None
        
    def test_mock_stt_service_default_values(self):
        """Test MockSTTService default values."""
        service = MockSTTService()
        
        assert service.model_size == "base"
        assert service._model is None  # Initially not loaded

    def test_stt_service_is_model_loaded_property(self):
        """Test is_model_loaded property."""
        service = STTService()
        
        # Initially not loaded
        assert service.is_model_loaded is False
        
    def test_mock_stt_service_is_model_loaded_property(self):
        """Test MockSTTService is_model_loaded property."""
        service = MockSTTService()
        
        # Initially not loaded
        assert service.is_model_loaded is False

    def test_mock_stt_service_load_model(self):
        """Test MockSTTService load_model returns True."""
        service = MockSTTService()
        
        result = service.load_model()
        
        assert result is True
        assert service.is_model_loaded is True

    def test_mock_stt_service_transcribe_audio_returns_string(self):
        """Test MockSTTService transcribe_audio returns a string."""
        service = MockSTTService()
        service.load_model()
        
        result = service.transcribe_audio("/fake/path/audio.webm")
        
        assert isinstance(result, str)
        assert len(result) > 0


class TestSTTServiceGlobalInstance:
    """Tests for global STT service instance."""

    def test_get_stt_service_returns_instance(self):
        """Test get_stt_service returns an instance."""
        service = get_stt_service()
        
        assert service is not None
        assert isinstance(service, STTService)

    def test_global_service_is_mock_by_default(self):
        """Test global service is MockSTTService by default."""
        service = get_stt_service()
        
        # Should be a mock service (for development without actual model)
        assert isinstance(service, MockSTTService)


class TestSTTServiceModelSizes:
    """Tests for STT model size configurations."""

    def test_stt_service_accepts_model_size(self):
        """Test STTService accepts different model sizes."""
        service_tiny = STTService(model_size="tiny")
        service_small = STTService(model_size="small")
        service_medium = STTService(model_size="medium")
        
        assert service_tiny.model_size == "tiny"
        assert service_small.model_size == "small"
        assert service_medium.model_size == "medium"

    def test_mock_stt_service_accepts_model_size(self):
        """Test MockSTTService accepts different model sizes."""
        service = MockSTTService(model_size="large")
        
        assert service.model_size == "large"


class TestSTTValidation:
    """Tests validating STT meets VAL-SPEECH requirements."""

    def test_val_speech_001_stt_service_exists(self):
        """VAL-SPEECH-001: STT service exists for speech-to-text."""
        from src.services.stt import STTService, get_stt_service
        service = get_stt_service()
        
        assert service is not None
        assert hasattr(service, 'transcribe_audio')
        assert hasattr(service, 'transcribe_bytes')
        
    def test_val_speech_003_mock_transcription_returns_text(self):
        """VAL-SPEECH-003: Mock transcription returns text for voice messages."""
        service = MockSTTService()
        service.load_model()
        
        # Simulate voice recording transcription
        result = service.transcribe_audio("/fake/audio.webm")
        
        # Result should be text
        assert isinstance(result, str)
        assert len(result) > 0
