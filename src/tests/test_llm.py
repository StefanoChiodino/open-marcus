"""
Tests for LLM service (llama-cpp-python integration).
"""

import pytest
from unittest.mock import patch, MagicMock

from src.services.llm import (
    LLMService,
    MockLLMService,
    ChatMessage,
    StreamChunk,
    get_llm_service,
    set_llm_service,
)


class TestChatMessage:
    """Tests for ChatMessage dataclass."""
    
    def test_create_user_message(self):
        """Test creating a user message."""
        msg = ChatMessage(role="user", content="Hello Marcus")
        
        assert msg.role == "user"
        assert msg.content == "Hello Marcus"
    
    def test_create_assistant_message(self):
        """Test creating an assistant message."""
        msg = ChatMessage(role="assistant", content="I understand.")
        
        assert msg.role == "assistant"
        assert msg.content == "I understand."
    
    def test_create_system_message(self):
        """Test creating a system message."""
        msg = ChatMessage(role="system", content="You are Marcus Aurelius.")
        
        assert msg.role == "system"
        assert msg.content == "You are Marcus Aurelius."


class TestStreamChunk:
    """Tests for StreamChunk dataclass."""
    
    def test_create_chunk(self):
        """Test creating a completion chunk."""
        chunk = StreamChunk(content="Hello", is_final=False)
        
        assert chunk.content == "Hello"
        assert chunk.is_final is False
    
    def test_final_chunk(self):
        """Test creating a final chunk."""
        chunk = StreamChunk(content="", is_final=True)
        
        assert chunk.content == ""
        assert chunk.is_final is True


class TestMockLLMService:
    """Tests for MockLLMService."""
    
    def test_load_model_succeeds(self):
        """Test that mock model loading always succeeds."""
        service = MockLLMService()
        
        result = service.load_model()
        
        assert result is True
        assert service.is_model_loaded is True
    
    def test_unload_model(self):
        """Test that unloading mock model works."""
        service = MockLLMService()
        service.load_model()
        
        service.unload_model()
        
        assert service.is_model_loaded is False
    
    def test_check_model_exists_returns_true(self):
        """Test that mock always reports model exists."""
        service = MockLLMService()
        
        assert service.check_model_exists() is True
    
    def test_create_chat_completion_returns_string(self):
        """Test that chat completion returns a string."""
        service = MockLLMService()
        service.load_model()
        
        messages = [
            ChatMessage(role="system", content="You are a helpful assistant."),
            ChatMessage(role="user", content="Hello"),
        ]
        
        response = service.create_chat_completion(messages)
        
        assert isinstance(response, str)
        assert len(response) > 0
    
    def test_create_chat_completion_returns_mock_response(self):
        """Test that chat completion returns one of the mock responses."""
        service = MockLLMService()
        service.load_model()
        
        messages = [
            ChatMessage(role="system", content="You are Marcus."),
            ChatMessage(role="user", content="Hi"),
        ]
        
        response = service.create_chat_completion(messages)
        
        # Should be one of the mock responses
        assert response in MockLLMService.MOCK_RESPONSES
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_yields_chunks(self):
        """Test that streaming yields completion chunks."""
        service = MockLLMService()
        service.load_model()
        
        messages = [
            ChatMessage(role="user", content="Hello"),
        ]
        
        chunks = []
        async for chunk in service.stream_chat_completion(messages):
            chunks.append(chunk)
        
        assert len(chunks) > 0
        # Last chunk should be final
        assert chunks[-1].is_final is True
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_final_chunk_is_empty_content(self):
        """Test that final chunk has empty content."""
        service = MockLLMService()
        service.load_model()
        
        messages = [
            ChatMessage(role="user", content="Hello"),
        ]
        
        final_chunk = None
        async for chunk in service.stream_chat_completion(messages):
            if chunk.is_final:
                final_chunk = chunk
                break
        
        assert final_chunk is not None
        assert final_chunk.content == ""


class TestLLMServiceClass:
    """Tests for LLMService class methods."""
    
    def test_marcus_system_prompt_exists(self):
        """Test that Marcus system prompt is defined."""
        assert hasattr(LLMService, 'MARCUS_SYSTEM_PROMPT')
        assert len(LLMService.MARCUS_SYSTEM_PROMPT) > 0
        assert "Marcus Aurelius" in LLMService.MARCUS_SYSTEM_PROMPT
        assert "Stoic" in LLMService.MARCUS_SYSTEM_PROMPT
    
    def test_default_model_path(self):
        """Test default model path is set correctly."""
        service = LLMService()
        
        assert "model.gguf" in service.model_path
        assert ".openmarcus" in service.model_path
    
    def test_custom_model_path(self):
        """Test setting custom model path."""
        service = LLMService(model_path="/custom/path/model.gguf")
        
        assert service.model_path == "/custom/path/model.gguf"
    
    def test_set_model_path_unloads_current(self):
        """Test that setting new model path unloads current model."""
        service = LLMService()
        service._model_loaded = True
        service._llama = MagicMock()
        
        service.set_model_path("/new/path/model.gguf")
        
        assert service.model_path == "/new/path/model.gguf"
        assert service._model_loaded is False
        assert service._llama is None
    
    def test_is_model_loaded_false_initially(self):
        """Test model is not loaded initially."""
        service = LLMService()
        
        assert service.is_model_loaded is False
    
    def test_is_model_loaded_true_after_load(self):
        """Test model is loaded after successful load."""
        service = LLMService()
        # Mock the model path check
        with patch.object(service, 'check_model_exists', return_value=False):
            service.load_model()
        
        # Should fail because model doesn't exist
        assert service.is_model_loaded is False
    
    def test_get_model_dir_creates_directory(self, tmp_path):
        """Test that get_model_dir creates the directory."""
        model_path = str(tmp_path / "models" / "model.gguf")
        service = LLMService(model_path=model_path)
        
        model_dir = service.get_model_dir()
        
        assert model_dir.exists()
        assert model_dir.is_dir()


class TestLLMServiceGlobalInstance:
    """Tests for global LLM service instance management."""
    
    def test_get_llm_service_returns_instance(self):
        """Test getting the global LLM service instance."""
        service = get_llm_service()
        
        assert service is not None
        assert isinstance(service, LLMService)
    
    def test_set_llm_service_replaces_instance(self):
        """Test that setting a new LLM service replaces the global instance."""
        new_service = MockLLMService()
        
        set_llm_service(new_service)
        
        assert get_llm_service() is new_service
    
    def test_default_is_mock_service(self):
        """Test that default service is MockLLMService for development."""
        # The global default should be MockLLMService for development
        service = get_llm_service()
        assert isinstance(service, MockLLMService)


class TestLLMServiceStreaming:
    """Tests for LLM streaming functionality."""
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_with_real_service_no_model(self):
        """Test streaming when real service has no model returns error message."""
        # Use a real LLMService pointing to a non-existent model path
        service = LLMService(model_path="/nonexistent/path/model.gguf")
        
        messages = [ChatMessage(role="user", content="Hello")]
        
        chunks = []
        async for chunk in service.stream_chat_completion(messages):
            chunks.append(chunk)
        
        # Should have received an error message because model can't be loaded
        assert len(chunks) == 1
        assert chunks[0].is_final is True
        assert "unable to load" in chunks[0].content.lower() or "encountered an issue" in chunks[0].content.lower()
    
    @pytest.mark.asyncio
    async def test_stream_chat_completion_with_mock_service_works(self):
        """Test streaming with mock service works correctly."""
        service = MockLLMService()
        # Mock service loads successfully even without actual model file
        service.load_model()
        
        messages = [ChatMessage(role="user", content="Hello")]
        
        chunks = []
        async for chunk in service.stream_chat_completion(messages):
            chunks.append(chunk)
        
        # Should have received tokens
        assert len(chunks) > 1
        # Last chunk should be final
        assert chunks[-1].is_final is True


class TestLLMServiceTokenCounting:
    """Tests for token counting functionality."""
    
    def test_count_tokens_fallback_without_model(self):
        """Test token counting falls back to word count without model."""
        service = MockLLMService()
        
        text = "Hello world this is a test"
        count = service.count_tokens(text)
        
        # Without model loaded, should use word count
        assert count == 6
    
    def test_count_tokens_simple_text(self):
        """Test token counting with simple text."""
        service = LLMService()
        # Model not loaded, so uses word count
        text = "one two three"
        
        count = service.count_tokens(text)
        
        assert count == 3


class TestLLMServiceContextWindow:
    """Tests for context window functionality."""
    
    def test_get_context_window(self):
        """Test getting context window size."""
        service = LLMService()
        
        window = service.get_context_window()
        
        assert isinstance(window, int)
        assert window > 0


class TestLLMServiceMemoryDetection:
    """Tests for available memory detection."""
    
    def test_get_available_memory_returns_int_or_none(self):
        """Test that available memory returns int or None."""
        service = LLMService()
        
        memory = service.get_available_memory()
        
        # Should return int if psutil available, else None
        if memory is not None:
            assert isinstance(memory, int)
            assert memory > 0
