"""
TTS Service using piper-tts for local text-to-speech.

Provides audio synthesis using piper-tts, a fast and local neural TTS system.
All processing runs locally without external API calls.
"""

import io
import logging
from pathlib import Path
from typing import Optional, List

from piper import PiperVoice, SynthesisConfig
import wave

logger = logging.getLogger(__name__)

# Default voice directory
DEFAULT_VOICE_DIR = Path.home() / ".openmarcus" / "tts"


class TTSService:
    """
    Service for local text-to-speech using piper-tts.
    
    Features:
    - Local audio synthesis
    - Multiple voice models
    - Adjustable speech rate
    - No external API calls
    - WAV output format
    
    The service maintains a loaded voice model for efficient synthesis.
    """
    
    # Available voices (voice_id -> description)
    AVAILABLE_VOICES = {
        "en_US-lessac-medium": "English (Lessac, Medium quality)",
        "en_US-lessac-high": "English (Lessac, High quality)",
        "en_US-amy-medium": "English (Amy, Medium quality)",
        "en_US-kathleen-low": "English (Kathleen, Low quality)",
        "en_US-kusal-low": "English (Kusal, Low quality)",
        "en_US-ryan-high": "English (Ryan, High quality)",
        "en_US-kaptain-low": "English (Kaptain, Low quality)",
    }
    
    def __init__(
        self,
        voice_id: str = "en_US-lessac-medium",
        voice_dir: Optional[Path] = None,
        speed: float = 1.0,
    ):
        """
        Initialize the TTS service.
        
        Args:
            voice_id: Voice identifier (e.g., 'en_US-lessac-medium')
            voice_dir: Directory containing voice model files (defaults to ~/.openmarcus/tts)
            speed: Speech rate multiplier (1.0 = normal, 0.8 = slower, 1.2 = faster)
        """
        self.voice_id = voice_id
        self.voice_dir = voice_dir or DEFAULT_VOICE_DIR
        self.speed = speed
        self._voice: Optional[PiperVoice] = None
        self._config: Optional[dict] = None
    
    @property
    def is_voice_loaded(self) -> bool:
        """Check if a voice model is currently loaded."""
        return self._voice is not None
    
    def get_voice_path(self) -> Path:
        """Get the path to the voice directory."""
        return self.voice_dir
    
    def check_voice_exists(self, voice_id: Optional[str] = None) -> bool:
        """
        Check if the voice model files exist.
        
        Args:
            voice_id: Voice ID to check. If None, uses current voice_id.
            
        Returns:
            True if voice files exist, False otherwise.
        """
        voice_id = voice_id or self.voice_id
        onnx_path = self.voice_dir / f"{voice_id}.onnx"
        config_path = self.voice_dir / f"{voice_id}.onnx.json"
        
        return onnx_path.exists() and config_path.exists()
    
    def load_voice(self, voice_id: Optional[str] = None) -> bool:
        """
        Load a piper voice model.
        
        Args:
            voice_id: Voice ID to load. If None, uses current voice_id.
            
        Returns:
            True if voice loaded successfully, False otherwise.
        """
        voice_id = voice_id or self.voice_id
        
        if self._voice is not None and self.voice_id == voice_id:
            logger.info("Voice model already loaded")
            return True
        
        try:
            logger.info(f"Loading TTS voice: {voice_id}")
            
            onnx_path = self.voice_dir / f"{voice_id}.onnx"
            config_path = self.voice_dir / f"{voice_id}.onnx.json"
            
            if not onnx_path.exists():
                logger.error(f"Voice model not found: {onnx_path}")
                return False
            
            # Load voice from ONNX model and config
            self._voice = PiperVoice.load(str(onnx_path), str(config_path))
            self.voice_id = voice_id
            
            # Load config for sample rate
            import json
            with open(config_path, 'r') as f:
                self._config = json.load(f)
            
            logger.info("TTS voice loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load TTS voice: {e}")
            self._voice = None
            return False
    
    def unload_voice(self) -> None:
        """Unload the voice model from memory."""
        if self._voice is not None:
            logger.info("Unloading TTS voice")
            del self._voice
            self._voice = None
            self._config = None
    
    def get_sample_rate(self) -> int:
        """Get the sample rate of the loaded voice."""
        if self._config:
            return self._config.get("audio", {}).get("sample_rate", 22050)
        return 22050  # Default sample rate
    
    def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """
        Synthesize text to audio.
        
        Args:
            text: Text to synthesize
            voice_id: Voice ID to use. If None, uses loaded voice.
            
        Returns:
            WAV audio bytes
        """
        # Ensure voice is loaded
        if voice_id and voice_id != self.voice_id:
            if not self.load_voice(voice_id):
                logger.error(f"Failed to load voice: {voice_id}")
                return b""
        elif self._voice is None:
            if not self.load_voice():
                logger.error("Failed to load default voice")
                return b""
        
        # Voice is now guaranteed to be loaded
        assert self._voice is not None
        
        try:
            logger.info(f"Synthesizing text: {text[:50]}...")
            
            # Configure synthesis with speech rate
            config = SynthesisConfig(
                length_scale=1.0 / self.speed,  # Piper uses length_scale (inverse of speed)
                noise_scale=0.667,
                noise_w_scale=0.8,
            )
            
            # Synthesize audio - returns Iterable[AudioChunk]
            audio_chunks = self._voice.synthesize(text, config)
            
            # Collect audio bytes from all chunks
            raw_audio_parts = []
            sample_rate = 22050
            
            for chunk in audio_chunks:
                raw_audio_parts.append(chunk.audio_int16_bytes)
                sample_rate = chunk.sample_rate
            
            # Combine all raw audio parts
            raw_bytes = b"".join(raw_audio_parts)
            
            # Convert raw audio to WAV
            wav_bytes = self._raw_to_wav(raw_bytes, sample_rate)
            
            logger.info(f"Synthesis complete: {len(wav_bytes)} bytes")
            return wav_bytes
            
        except Exception as e:
            logger.error(f"Synthesis error: {e}")
            return b""
    
    def _raw_to_wav(self, raw_bytes: bytes, sample_rate: int = 22050) -> bytes:
        """
        Convert raw 16-bit PCM audio to WAV format.
        
        Args:
            raw_bytes: Raw 16-bit PCM audio samples
            sample_rate: Sample rate of the audio (default 22050)
            
        Returns:
            WAV formatted bytes
        """
        channels = 1
        bits_per_sample = 16
        
        # Create WAV file in memory
        wav_buffer = io.BytesIO()
        
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(channels)
            wav_file.setsampwidth(bits_per_sample // 8)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(raw_bytes)
        
        return wav_buffer.getvalue()
    
    def synthesize_to_file(self, text: str, output_path: str, voice_id: Optional[str] = None) -> bool:
        """
        Synthesize text and save to a WAV file.
        
        Args:
            text: Text to synthesize
            output_path: Path to save the WAV file
            voice_id: Voice ID to use. If None, uses loaded voice.
            
        Returns:
            True if synthesis and save successful, False otherwise.
        """
        audio_bytes = self.synthesize(text, voice_id)
        
        if not audio_bytes:
            return False
        
        try:
            with open(output_path, 'wb') as f:
                f.write(audio_bytes)
            logger.info(f"Audio saved to: {output_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save audio: {e}")
            return False
    
    def get_available_voices(self) -> List[dict]:
        """
        Get list of available voice models.
        
        Returns:
            List of dicts with voice_id and description.
        """
        voices = []
        for voice_id, description in self.AVAILABLE_VOICES.items():
            is_downloaded = self.check_voice_exists(voice_id)
            voices.append({
                "voice_id": voice_id,
                "description": description,
                "downloaded": is_downloaded,
            })
        return voices


class MockTTSService(TTSService):
    """
    Mock TTS service for testing without actual voice model.
    
    Returns placeholder audio (silent WAV).
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize mock TTS service."""
        super().__init__(*args, **kwargs)
    
    def load_voice(self, voice_id: Optional[str] = None) -> bool:
        """Mock voice load - always succeeds."""
        # Use a mock object instead of True to satisfy type checker
        self._voice = "mock"  # type: ignore[assignment]  # Mock value to pass is_voice_loaded check
        self.voice_id = voice_id or self.voice_id
        logger.info("Mock TTS voice loaded")
        return True
    
    def synthesize(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Return a mock WAV audio (short silent)."""
        # Generate a short silent WAV file for testing
        sample_rate = 22050
        duration_ms = min(len(text) * 50, 2000)  # ~50ms per char, max 2s
        num_samples = int(sample_rate * duration_ms / 1000)
        
        # Create silent WAV
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            # Write silence (zeros)
            wav_file.writeframes(b'\x00\x00' * num_samples)
        
        logger.info(f"Mock TTS: synthesized {len(text)} chars")
        return wav_buffer.getvalue()


# Global instance
# Use MockTTSService by default - production should use TTSService
tts_service: TTSService = MockTTSService()


def get_tts_service() -> TTSService:
    """Get the global TTS service instance."""
    return tts_service


def set_tts_service(service: TTSService) -> None:
    """Set a custom TTS service instance."""
    global tts_service
    tts_service = service


def download_voice(voice_id: str, voice_dir: Path = DEFAULT_VOICE_DIR) -> bool:
    """
    Download a voice model.
    
    Args:
        voice_id: Voice identifier to download
        voice_dir: Directory to download to
        
    Returns:
        True if download successful, False otherwise.
    """
    import subprocess
    import sys
    
    try:
        subprocess.run(
            [sys.executable, "-m", "piper.download_voices", "--download-dir", str(voice_dir), voice_id],
            capture_output=True,
            text=True,
            check=True,
        )
        logger.info(f"Downloaded voice: {voice_id}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to download voice {voice_id}: {e.stderr}")
        return False
