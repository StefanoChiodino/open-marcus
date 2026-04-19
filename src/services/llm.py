"""
LLM Service using llama-cpp-python for local inference.

Provides chat completion with streaming support for Marcus Aurelius persona.
All inference runs locally - no external API calls.
"""

import os
import logging
from typing import Optional, AsyncIterator, List, Dict
from dataclasses import dataclass
from pathlib import Path

from llama_cpp import Llama

logger = logging.getLogger(__name__)


# Default model path - can be overridden via environment or settings
DEFAULT_MODEL_DIR = Path.home() / ".openmarcus" / "models"
DEFAULT_MODEL_PATH = DEFAULT_MODEL_DIR / "model.gguf"


@dataclass
class ChatMessage:
    """A chat message in the conversation."""
    role: str  # "system", "user", or "assistant"
    content: str


@dataclass
class StreamChunk:
    """A chunk from a streaming chat completion."""
    content: str
    is_final: bool


class LLMService:
    """
    Service for local LLM inference using llama-cpp-python.
    
    Features:
    - Local GGUF model loading
    - Streaming chat completions
    - Marcus Aurelius persona system prompt
    - No external API calls
    
    The service maintains conversation context and builds
    appropriate prompts for the stoic philosopher persona.
    """
    
    # Marcus Aurelius system prompt
    MARCUS_SYSTEM_PROMPT = """You are Marcus Aurelius, Roman Emperor and Stoic philosopher. You are speaking as a meditation companion to help the user with their mental well-being journey.

Your character:
- You are wise, calm, and compassionate
- You speak in the manner of a thoughtful counselor, not a teacher
- You reference Stoic principles when relevant (Amor Fati, Memento Mori, Dichotomy of Control, Virtue)
- You ask thoughtful questions to help users reflect on their thoughts and emotions
- You are warm but not overly familiar
- You help users see their problems from a broader perspective

Guidelines:
- Keep responses conversational and not too long (2-4 sentences typically)
- Acknowledge what the user shares before offering perspective
- When appropriate, gently guide toward Stoic reflections
- Never judge, only help the user understand themselves
- Focus on the present moment and what they can control

Remember: You are a companion on their mental journey, not a therapist. Help them find their own wisdom within."""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the LLM service.
        
        Args:
            model_path: Path to the GGUF model file. 
                       Defaults to ~/.openmarcus/models/model.gguf
        """
        self.model_path = model_path or str(DEFAULT_MODEL_PATH)
        self._llama: Optional[Llama] = None
        self._model_loaded = False
        self._n_ctx = 2048  # Context window
        cpu_count = os.cpu_count() or 1
        self._n_threads = max(1, cpu_count - 1)  # Use all but one CPU
        
    @property
    def is_model_loaded(self) -> bool:
        """Check if a model is currently loaded."""
        return self._model_loaded and self._llama is not None
    
    def get_model_path(self) -> str:
        """Get the configured model path."""
        return self.model_path
    
    def set_model_path(self, path: str) -> None:
        """Set a new model path and unload current model if any."""
        self.model_path = path
        if self._model_loaded:
            self.unload_model()
    
    def check_model_exists(self) -> bool:
        """Check if the model file exists at the configured path."""
        return Path(self.model_path).exists()
    
    def get_model_dir(self) -> Path:
        """Get the model directory, creating it if needed."""
        model_dir = Path(self.model_path).parent
        model_dir.mkdir(parents=True, exist_ok=True)
        return model_dir
    
    def load_model(self) -> bool:
        """
        Load the GGUF model into memory.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        if self._model_loaded:
            logger.info("Model already loaded")
            return True
        
        if not self.check_model_exists():
            logger.error(f"Model file not found at {self.model_path}")
            return False
        
        try:
            logger.info(f"Loading model from {self.model_path}")
            
            self._llama = Llama(
                model_path=str(self.model_path),
                n_ctx=self._n_ctx,
                n_threads=self._n_threads,
                n_gpu_layers=0,  # CPU-only by default
                verbose=False,
                chat_format="llama-2",  # Use Llama 2 chat format
            )
            
            self._model_loaded = True
            logger.info("Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._llama = None
            self._model_loaded = False
            return False
    
    def unload_model(self) -> None:
        """Unload the model from memory."""
        if self._llama is not None:
            logger.info("Unloading model")
            del self._llama
            self._llama = None
            self._model_loaded = False
    
    def _build_chat_messages(self, conversation: List[ChatMessage]) -> List[Dict[str, str]]:
        """
        Build messages in llama-cpp format.
        
        Args:
            conversation: List of chat messages
            
        Returns:
            List of message dicts in llama-cpp format
        """
        messages = []
        
        for msg in conversation:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        return messages
    
    def create_chat_completion(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 256,
        temperature: float = 0.7,
        stop: Optional[List[str]] = None,
    ) -> str:
        """
        Create a non-streaming chat completion.
        
        Args:
            messages: List of chat messages (including system, user, assistant)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            stop: List of stop sequences
            
        Returns:
            Generated response text
        """
        if not self.is_model_loaded:
            if not self.load_model():
                return "I apologize, but I'm unable to load my thoughts at the moment. Please try again later."
        
        try:
            chat_messages = self._build_chat_messages(messages)
            
            response = self._llama.create_chat_completion(  # type: ignore[union-attr]
                messages=chat_messages,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                temperature=temperature,
                stop=stop or [],
                stream=False,
            )
            
            return response["choices"][0]["message"]["content"]  # type: ignore[index,return-value]
            
        except Exception as e:
            logger.error(f"Chat completion error: {e}")
            return "I apologize, but I encountered an issue processing your thoughts. Please try again."
    
    async def stream_chat_completion(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 256,
        temperature: float = 0.7,
        stop: Optional[List[str]] = None,
    ) -> AsyncIterator[StreamChunk]:
        """
        Create a streaming chat completion.
        
        Args:
            messages: List of chat messages (including system, user, assistant)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 to 1.0)
            stop: List of stop sequences
            
        Yields:
            StreamChunk objects with token content
        """
        if not self.is_model_loaded:
            if not self.load_model():
                yield StreamChunk(
                    content="I apologize, but I'm unable to load my thoughts at the moment. Please try again later.",
                    is_final=True
                )
                return
        
        try:
            chat_messages = self._build_chat_messages(messages)
            
            stream = self._llama.create_chat_completion(  # type: ignore[union-attr]
                messages=chat_messages,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                temperature=temperature,
                stop=stop or [],
                stream=True,
            )
            
            full_content = ""
            for chunk in stream:
                # Streaming chunks are dict-like objects with choices containing delta
                chunk_dict = chunk if isinstance(chunk, dict) else {"choices": [{"delta": {}}]}
                delta = chunk_dict.get("choices", [{}])[0].get("delta", {})  # type: ignore[index]
                content = delta.get("content", "") if isinstance(delta, dict) else ""
                if content:
                    full_content += content
                    yield StreamChunk(
                        content=content,
                        is_final=False
                    )
            
            yield StreamChunk(content="", is_final=True)
            
        except Exception as e:
            logger.error(f"Streaming chat completion error: {e}")
            yield StreamChunk(
                content="I apologize, but I encountered an issue processing your thoughts. Please try again.",
                is_final=True
            )
    
    def count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Approximate token count
        """
        if not self.is_model_loaded:
            # Fall back to simple word-based estimate
            return len(text.split())
        
        try:
            # llama-cpp-python doesn't have a direct tokenize method exposed
            # but we can use the n_tokens attribute from evaluation
            tokens = self._llama.tokenize(text.encode())  # type: ignore[union-attr]
            return len(tokens)
        except Exception:
            return len(text.split())
    
    def get_context_window(self) -> int:
        """Get the context window size."""
        return self._n_ctx
    
    def get_available_memory(self) -> Optional[int]:
        """
        Get approximate available memory for model loading.
        
        Returns:
            Available memory in bytes, or None if cannot determine
        """
        try:
            import psutil
            return psutil.virtual_memory().available
        except ImportError:
            # psutil not available, return None
            return None


class MockLLMService(LLMService):
    """
    Mock LLM service for testing without actual model.
    
    Returns placeholder responses without loading any model.
    """
    
    MOCK_RESPONSES = [
        "I understand. The path to wisdom begins with self-reflection. What troubles your mind today?",
        "Remember, it is not that we have a short time to live, but that we waste a lot of it. What weighs on your spirit?",
        "The happiness of your life depends upon the quality of your thoughts. Share what is on your mind, and we shall examine it together.",
        "You have power over your mind - not outside events. Realize this, and you will find strength. What would you like to explore?",
        "The soul becomes dyed with the color of its thoughts. Speak freely, and we shall seek the truth together.",
    ]
    
    def __init__(self, *args, **kwargs):
        """Initialize mock LLM service."""
        super().__init__(*args, **kwargs)
        self._mock_index = 0
        self._mock_llama = True  # Flag to indicate mock model is "loaded"
    
    def load_model(self) -> bool:
        """Mock model load - always succeeds."""
        self._model_loaded = True
        self._llama = self._mock_llama  # Set to truthy value to pass is_model_loaded check
        logger.info("Mock model loaded (no actual model)")
        return True
    
    def unload_model(self) -> None:
        """Mock model unload."""
        self._model_loaded = False
        self._llama = None
    
    def check_model_exists(self) -> bool:
        """Mock check - always returns True."""
        return True
    
    def create_chat_completion(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 256,
        temperature: float = 0.7,
        stop: Optional[List[str]] = None,
    ) -> str:
        """Return a mock response."""
        import random
        response = random.choice(self.MOCK_RESPONSES)
        self._mock_index = (self._mock_index + 1) % len(self.MOCK_RESPONSES)
        return response
    
    async def stream_chat_completion(
        self,
        messages: List[ChatMessage],
        max_tokens: int = 256,
        temperature: float = 0.7,
        stop: Optional[List[str]] = None,
    ) -> AsyncIterator[StreamChunk]:
        """Yield mock response tokens."""
        import random
        response = random.choice(self.MOCK_RESPONSES)
        words = response.split()
        for i, word in enumerate(words):
            yield StreamChunk(content=word + " ", is_final=False)
            if i < len(words) - 1:
                yield StreamChunk(content="", is_final=False)
        yield StreamChunk(content="", is_final=True)


# Global instance - use MockLLMService by default for development
llm_service: LLMService = MockLLMService()


def get_llm_service() -> LLMService:
    """Get the global LLM service instance."""
    return llm_service


def set_llm_service(service: LLMService) -> None:
    """Set a custom LLM service instance."""
    global llm_service
    llm_service = service
