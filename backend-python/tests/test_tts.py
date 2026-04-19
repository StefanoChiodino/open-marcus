"""
Tests for TTS Service using piper-tts.
"""

import pytest
from unittest.mock import MagicMock, patch
from src.services.tts import TTSService, MockTTSService, get_tts_service, download_voice
from pathlib import Path


class TestTTSServiceImports:
    """Test that TTS service can be imported correctly."""

    def test_tts_service_imports_successfully(self):
        """Test TTS service class can be imported."""
        from src.services.tts import TTSService
        assert TTSService is not None

    def test_mock_tts_service_imports_successfully(self):
        """Test MockTTS service class can be imported."""
        from src.services.tts import MockTTSService
        assert MockTTSService is not None


class TestTTSServiceStructure:
    """Tests for TTS service class structure."""

    def test_tts_service_has_required_attributes(self):
        """Test TTSService initializes with required attributes."""
        service = TTSService()
        
        assert hasattr(service, 'voice_id')
        assert hasattr(service, 'voice_dir')
        assert hasattr(service, 'speed')
        assert hasattr(service, '_voice')
        assert hasattr(service, '_config')
        
    def test_mock_tts_service_has_required_attributes(self):
        """Test MockTTSService initializes with required attributes."""
        service = MockTTSService()
        
        assert hasattr(service, 'voice_id')
        assert hasattr(service, 'voice_dir')
        assert hasattr(service, 'speed')
        assert hasattr(service, '_voice')
        assert hasattr(service, '_config')

    def test_tts_service_default_values(self):
        """Test TTSService default values."""
        service = TTSService()
        
        assert service.voice_id == "en_US-lessac-medium"
        assert service.speed == 1.0
        assert service._voice is None
        
    def test_mock_tts_service_default_values(self):
        """Test MockTTSService default values."""
        service = MockTTSService()
        
        assert service.voice_id == "en_US-lessac-medium"
        assert service.speed == 1.0
        assert service._voice is None  # Initially not loaded

    def test_tts_service_is_voice_loaded_property(self):
        """Test is_voice_loaded property."""
        service = TTSService()
        
        # Initially not loaded
        assert service.is_voice_loaded is False
        
    def test_mock_tts_service_is_voice_loaded_property(self):
        """Test MockTTSService is_voice_loaded property."""
        service = MockTTSService()
        
        # Initially not loaded
        assert service.is_voice_loaded is False

    def test_mock_tts_service_load_voice(self):
        """Test MockTTSService load_voice returns True."""
        service = MockTTSService()
        
        result = service.load_voice()
        
        assert result is True
        assert service.is_voice_loaded is True

    def test_mock_tts_service_synthesize_returns_bytes(self):
        """Test MockTTSService synthesize returns WAV bytes."""
        service = MockTTSService()
        service.load_voice()
        
        result = service.synthesize("Hello, world!")
        
        assert isinstance(result, bytes)
        assert len(result) > 0
        # Check WAV header
        assert result[:4] == b'RIFF'


class TestTTSServiceGlobalInstance:
    """Tests for global TTS service instance."""

    def test_get_tts_service_returns_instance(self):
        """Test get_tts_service returns an instance."""
        service = get_tts_service()
        
        assert service is not None
        assert isinstance(service, TTSService)

    def test_global_service_is_mock_by_default(self):
        """Test global service is MockTTSService by default."""
        service = get_tts_service()
        
        # Should be a mock service (for development without actual model)
        assert isinstance(service, MockTTSService)


class TestTTSServiceVoices:
    """Tests for TTS voice configurations."""

    def test_tts_service_has_available_voices(self):
        """Test TTSService has AVAILABLE_VOICES dict."""
        service = TTSService()
        
        assert hasattr(service, 'AVAILABLE_VOICES')
        assert isinstance(service.AVAILABLE_VOICES, dict)
        assert len(service.AVAILABLE_VOICES) > 0

    def test_tts_service_default_voice_in_available(self):
        """Test default voice is in AVAILABLE_VOICES."""
        service = TTSService()
        
        assert service.voice_id in service.AVAILABLE_VOICES

    def test_tts_service_accepts_voice_id(self):
        """Test TTSService accepts different voice IDs."""
        service = TTSService(voice_id="en_US-amy-medium")
        
        assert service.voice_id == "en_US-amy-medium"

    def test_mock_tts_service_accepts_voice_id(self):
        """Test MockTTSService accepts different voice IDs."""
        service = MockTTSService(voice_id="en_US-ryan-high")
        
        assert service.voice_id == "en_US-ryan-high"

    def test_tts_service_accepts_speed_parameter(self):
        """Test TTSService accepts speed parameter."""
        service = TTSService(speed=1.5)
        
        assert service.speed == 1.5


class TestTTSServiceSynthesis:
    """Tests for TTS synthesis functionality."""

    def test_mock_synthesize_empty_text(self):
        """Test MockTTSService synthesize with empty text returns bytes."""
        service = MockTTSService()
        service.load_voice()
        
        result = service.synthesize("")
        
        assert isinstance(result, bytes)

    def test_mock_synthesize_normal_text(self):
        """Test MockTTSService synthesize with normal text."""
        service = MockTTSService()
        service.load_voice()
        
        result = service.synthesize("Hello, Marcus!")
        
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_mock_synthesize_long_text(self):
        """Test MockTTSService synthesize with long text."""
        service = MockTTSService()
        service.load_voice()
        
        long_text = "This is a longer text. " * 50
        result = service.synthesize(long_text)
        
        assert isinstance(result, bytes)
        assert len(result) > 0


class TestTTSServiceVoiceManagement:
    """Tests for TTS voice management."""

    def test_get_available_voices_returns_list(self):
        """Test get_available_voices returns a list."""
        service = TTSService()
        
        voices = service.get_available_voices()
        
        assert isinstance(voices, list)
        assert len(voices) > 0

    def test_get_available_voices_format(self):
        """Test get_available_voices returns proper format."""
        service = TTSService()
        
        voices = service.get_available_voices()
        
        for voice in voices:
            assert 'voice_id' in voice
            assert 'description' in voice
            assert 'downloaded' in voice

    def test_check_voice_exists_default(self):
        """Test check_voice_exists for default voice."""
        service = TTSService()
        
        # This may be True or False depending on whether voice is downloaded
        result = service.check_voice_exists()
        assert isinstance(result, bool)


class TestTTSValidation:
    """Tests validating TTS meets VAL-SPEECH requirements."""

    def test_val_speech_002_tts_service_exists(self):
        """VAL-SPEECH-002: TTS service exists for text-to-speech."""
        from src.services.tts import TTSService, get_tts_service
        service = get_tts_service()
        
        assert service is not None
        assert hasattr(service, 'synthesize')
        assert hasattr(service, 'synthesize_to_file')
        
    def test_val_speech_002_mock_synthesize_returns_audio(self):
        """VAL-SPEECH-002: Mock synthesis returns playable audio."""
        service = MockTTSService()
        service.load_voice()
        
        # Simulate AI response
        ai_response = "I understand your concern. Let us reflect on this together."
        audio = service.synthesize(ai_response)
        
        # Result should be audio bytes (WAV format)
        assert isinstance(audio, bytes)
        assert len(audio) > 0
        assert audio[:4] == b'RIFF'  # WAV header

    def test_val_speech_004_voice_selection_available(self):
        """VAL-SPEECH-004: Voice selection is available."""
        service = TTSService()
        
        # Should have multiple voices
        assert len(service.AVAILABLE_VOICES) > 1
        
        # Should be able to get available voices
        voices = service.get_available_voices()
        assert isinstance(voices, list)
        assert len(voices) > 1

    def test_val_speech_004_voice_id_in_voices(self):
        """VAL-SPEECH-004: Each voice has proper identification."""
        service = TTSService()
        
        voices = service.get_available_voices()
        
        for voice in voices:
            assert 'voice_id' in voice
            assert 'description' in voice
            # voice_id should match format like 'en_US-lessac-medium'
            assert '_' in voice['voice_id']


class TestTTSServiceSpeed:
    """Tests for TTS speed control."""

    def test_tts_service_speed_default(self):
        """Test TTSService default speed is 1.0."""
        service = TTSService()
        
        assert service.speed == 1.0

    def test_tts_service_speed_custom(self):
        """Test TTSService accepts custom speed."""
        service = TTSService(speed=0.8)
        
        assert service.speed == 0.8

    def test_mock_synthesize_with_speed(self):
        """Test MockTTSService synthesize respects speed parameter."""
        service = MockTTSService(speed=0.8)
        service.load_voice()
        
        # Should still produce audio
        result = service.synthesize("Testing speed.")
        
        assert isinstance(result, bytes)
        assert len(result) > 0


class TestDownloadVoice:
    """Tests for voice download functionality."""

    def test_download_voice_function_exists(self):
        """Test download_voice function exists."""
        assert callable(download_voice)

    @patch('subprocess.run')
    def test_download_voice_success(self, mock_run):
        """Test download_voice calls subprocess correctly."""
        mock_run.return_value = MagicMock(returncode=0)
        
        result = download_voice("en_US-lessac-medium")
        
        assert mock_run.called
        # Note: result depends on actual subprocess success
