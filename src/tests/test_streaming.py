"""
Tests for streaming message functionality.
"""

from src.services.api_client import StreamHandler


class TestStreamHandler:
    """Tests for StreamHandler class."""
    
    def test_stream_handler_initialization(self):
        """Test StreamHandler can be initialized with callbacks."""
        async def on_token(t):
            pass
        async def on_complete(d):
            pass
        
        handler = StreamHandler(
            on_token=on_token,
            on_complete=on_complete,
        )
        
        assert handler.on_token == on_token
        assert handler.on_complete == on_complete
        assert handler.on_session_state is None
        assert handler.on_error is None
    
    def test_stream_handler_optional_callbacks(self):
        """Test StreamHandler works with no callbacks."""
        handler = StreamHandler()
        
        assert handler.on_token is None
        assert handler.on_session_state is None
        assert handler.on_complete is None
        assert handler.on_error is None
    
    def test_stream_handler_all_callbacks(self):
        """Test StreamHandler can have all callbacks."""
        async def on_token(t):
            pass
        async def on_session_state(s):
            pass
        async def on_complete(d):
            pass
        async def on_error(e):
            pass
        
        handler = StreamHandler(
            on_token=on_token,
            on_session_state=on_session_state,
            on_complete=on_complete,
            on_error=on_error,
        )
        
        assert handler.on_token == on_token
        assert handler.on_session_state == on_session_state
        assert handler.on_complete == on_complete
        assert handler.on_error == on_error
