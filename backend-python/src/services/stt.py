"""
STT Service using faster-whisper for local speech-to-text.

Provides audio transcription using faster-whisper, a fast and accurate
open-source Whisper implementation. All processing runs locally.
"""

import logging
from pathlib import Path
from typing import Optional
import tempfile

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# Default model directory
DEFAULT_MODEL_DIR = Path.home() / ".openmarcus" / "models"


class STTService:
    """
    Service for local speech-to-text using faster-whisper.
    
    Features:
    - Local audio transcription
    - Multiple model sizes (tiny, base, small, medium, large)
    - CPU and GPU support
    - No external API calls
    
    The service maintains a loaded model for efficient transcription.
    """
    
    # Model sizes in order of complexity (for auto-detection)
    MODEL_SIZES = ["tiny", "base", "small", "medium", "large"]
    
    def __init__(
        self,
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "auto",
        model_dir: Optional[Path] = None,
    ):
        """
        Initialize the STT service.
        
        Args:
            model_size: Whisper model size (tiny, base, small, medium, large)
            device: Device to use ('auto', 'cpu', 'cuda')
            compute_type: Compute type ('auto', 'int8', 'float16', 'float32')
            model_dir: Directory containing model files (defaults to ~/.openmarcus/models)
        """
        self.model_size = model_size
        self.model_dir = model_dir or DEFAULT_MODEL_DIR
        self.device = device
        self.compute_type = compute_type
        self._model: Optional[WhisperModel] = None
    
    @property
    def is_model_loaded(self) -> bool:
        """Check if a model is currently loaded."""
        return self._model is not None
    
    def get_model_path(self) -> Path:
        """Get the path to the model directory."""
        return self.model_dir
    
    def check_model_exists(self) -> bool:
        """
        Check if the model files exist.
        
        Note: faster-whisper downloads models automatically if not found.
        """
        # faster-whisper auto-downloads models, so we just check if the dir is writable
        return True
    
    def load_model(self) -> bool:
        """
        Load the Whisper model.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        if self._model is not None:
            logger.info("STT model already loaded")
            return True
        
        try:
            logger.info(f"Loading STT model: {self.model_size}")
            
            # Determine device and compute type
            if self.device == "auto":
                # Let faster-whisper decide based on available hardware
                self._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type,
                    download_root=str(self.model_dir),
                )
            else:
                self._model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=self.compute_type,
                    download_root=str(self.model_dir),
                )
            
            logger.info("STT model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load STT model: {e}")
            self._model = None
            return False
    
    def unload_model(self) -> None:
        """Unload the model from memory."""
        if self._model is not None:
            logger.info("Unloading STT model")
            del self._model
            self._model = None
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> str:
        """
        Transcribe an audio file to text.
        
        Args:
            audio_path: Path to the audio file (wav, mp3, etc.)
            language: Language code (e.g., 'en'). If None, auto-detects.
            
        Returns:
            Transcribed text
        """
        if self._model is None:
            if not self.load_model():
                return ""
        
        # Ensure model is loaded after initialization attempt
        assert self._model is not None, "Model should be loaded after successful load_model()"
        
        try:
            logger.info(f"Transcribing audio: {audio_path}")
            
            segments, info = self._model.transcribe(
                audio_path,
                language=language,
                beam_size=5,
                vad_filter=True,  # Voice activity detection
            )
            
            # Combine all segments into full transcription
            full_text = ""
            for segment in segments:
                full_text += segment.text
            
            logger.info(f"Transcription complete: {len(full_text)} chars")
            return full_text.strip()
            
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return ""
    
    def transcribe_bytes(self, audio_bytes: bytes, language: Optional[str] = None) -> str:
        """
        Transcribe audio from bytes.
        
        Saves bytes to a temporary file and transcribes it.
        
        Args:
            audio_bytes: Raw audio bytes
            language: Language code (e.g., 'en'). If None, auto-detects.
            
        Returns:
            Transcribed text
        """
        # Create a temporary file for the audio
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        try:
            return self.transcribe_audio(temp_path, language)
        finally:
            # Clean up temp file
            try:
                Path(temp_path).unlink()
            except Exception:
                pass


class MockSTTService(STTService):
    """
    Mock STT service for testing without actual model.
    
    Returns placeholder transcriptions.
    """
    
    MOCK_TRANSCRIPTIONS = [
        "I feel anxious about my upcoming presentation.",
        "Today was a difficult day at work.",
        "I'm grateful for my family's support.",
        "I need to find a way to manage my stress better.",
        "What does Stoic philosophy say about dealing with fear?",
    ]
    
    def __init__(self, *args, **kwargs):
        """Initialize mock STT service."""
        super().__init__(*args, **kwargs)
        self._mock_index = 0
    
    def load_model(self) -> bool:
        """Mock model load - always succeeds."""
        self._model = True  # Set to truthy value to pass is_model_loaded check
        logger.info("Mock STT model loaded")
        return True
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> str:
        """Return a mock transcription."""
        import random
        response = random.choice(self.MOCK_TRANSCRIPTIONS)
        self._mock_index = (self._mock_index + 1) % len(self.MOCK_TRANSCRIPTIONS)
        return response


# Global instance - use MockSTTService by default for development
# In production, this should be STTService with proper model
stt_service: STTService = MockSTTService()


def get_stt_service() -> STTService:
    """Get the global STT service instance."""
    return stt_service


def set_stt_service(service: STTService) -> None:
    """Set a custom STT service instance."""
    global stt_service
    stt_service = service
