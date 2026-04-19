"""
API Client for OpenMarcus backend communication.
"""

import httpx
import json
from typing import Optional, Callable, Awaitable, Any


class StreamHandler:
    """Handler for streaming responses from the API."""
    
    def __init__(
        self,
        on_token: Optional[Callable[[str], Awaitable[Any]]] = None,
        on_session_state: Optional[Callable[[str], Awaitable[Any]]] = None,
        on_complete: Optional[Callable[[dict], Awaitable[Any]]] = None,
        on_error: Optional[Callable[[str], Awaitable[Any]]] = None,
    ):
        """
        Initialize stream handler with callbacks.
        
        Args:
            on_token: Called for each token received
            on_session_state: Called when session state is received
            on_complete: Called when stream is complete with final message data
            on_error: Called when an error occurs
        """
        self.on_token = on_token
        self.on_session_state = on_session_state
        self.on_complete = on_complete
        self.on_error = on_error


class APIClient:
    """HTTP client for backend API calls."""
    
    BASE_URL = "http://localhost:8000"
    
    def __init__(self):
        self._token: Optional[str] = None
    
    @property
    def token(self) -> Optional[str]:
        """Get current auth token."""
        return self._token
    
    @token.setter
    def token(self, value: Optional[str]) -> None:
        """Set auth token."""
        self._token = value
    
    def clear_token(self) -> None:
        """Clear the auth token (logout)."""
        self._token = None
    
    def get_headers(self) -> dict:
        """Get headers including auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers
    
    async def post(self, path: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        """
        Make POST request to API.
        
        Args:
            path: API endpoint path (e.g., "/api/auth/login")
            data: JSON data to send
            
        Returns:
            Tuple of (response_data, error_message)
        """
        url = f"{self.BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    json=data,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid username or password"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                elif response.status_code == 422:
                    # Validation error - extract message
                    errors = response.json().get("detail", [])
                    if errors:
                        error_msg = errors[0].get("msg", "Validation error")
                    else:
                        error_msg = "Validation error"
                    return None, error_msg
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def register(self, username: str, password: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Register a new user.
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Tuple of (user_data, error_message)
        """
        return await self.post("/api/auth/register", {"username": username, "password": password})
    
    async def login(self, username: str, password: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Login user.
        
        Args:
            username: User's username
            password: User's password
            
        Returns:
            Tuple of (token_data, error_message)
        """
        return await self.post("/api/auth/login", {"username": username, "password": password})

    async def create_profile(self, name: str, goals: str, experience_level: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Create a profile for the current user.
        
        Args:
            name: User's display name
            goals: Meditation goals
            experience_level: Experience level (beginner, intermediate, advanced)
            
        Returns:
            Tuple of (profile_data, error_message)
        """
        return await self.post("/api/profile", {
            "name": name,
            "goals": goals,
            "experience_level": experience_level
        })
    
    async def get_profile(self) -> tuple[Optional[dict], Optional[str]]:
        """
        Get the current user's profile.
        
        Returns:
            Tuple of (profile_data, error_message)
        """
        return await self.get("/api/profile")
    
    async def update_profile(self, name: str, goals: str, experience_level: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Update the current user's profile.
        
        Args:
            name: User's display name
            goals: Meditation goals
            experience_level: Experience level (beginner, intermediate, advanced)
            
        Returns:
            Tuple of (profile_data, error_message)
        """
        return await self.put("/api/profile", {
            "name": name,
            "goals": goals,
            "experience_level": experience_level
        })
    
    async def get_settings(self) -> tuple[Optional[dict], Optional[str]]:
        """
        Get the current user's settings.
        
        Returns:
            Tuple of (settings_data, error_message)
        """
        return await self.get("/api/settings")
    
    async def update_settings(self, settings: dict) -> tuple[Optional[dict], Optional[str]]:
        """
        Update the current user's settings.
        
        Args:
            settings: Dictionary of settings to update
            
        Returns:
            Tuple of (settings_data, error_message)
        """
        return await self.put("/api/settings", settings)
    
    async def get_system_info(self) -> tuple[Optional[dict], Optional[str]]:
        """
        Get system information (RAM, etc.).
        
        Returns:
            Tuple of (system_info, error_message)
        """
        return await self.get("/api/settings/system")
    
    # Session methods
    async def create_session(self) -> tuple[Optional[dict], Optional[str]]:
        """
        Create a new meditation session.
        
        Returns:
            Tuple of (session_data, error_message)
        """
        return await self.post("/api/sessions", {})
    
    async def get_session(self, session_id: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Get a session by ID with its messages.
        
        Args:
            session_id: ID of the session
            
        Returns:
            Tuple of (session_data, error_message)
        """
        return await self.get(f"/api/sessions/{session_id}")
    
    async def list_sessions(self, limit: int = 50, offset: int = 0) -> tuple[Optional[dict], Optional[str]]:
        """
        List all sessions for the current user.
        
        Args:
            limit: Maximum number of sessions to return
            offset: Number of sessions to skip
            
        Returns:
            Tuple of (sessions_list_data, error_message)
        """
        return await self.get(f"/api/sessions?limit={limit}&offset={offset}")
    
    async def add_message(self, session_id: str, content: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Add a message to a session.
        
        Args:
            session_id: ID of the session
            content: Message content
            
        Returns:
            Tuple of (message_data, error_message)
        """
        return await self.post(f"/api/sessions/{session_id}/messages", {"content": content})
    
    async def stream_message(
        self,
        session_id: str,
        content: str,
        handler: StreamHandler,
    ) -> tuple[Optional[dict], Optional[str]]:
        """
        Add a message to a session with streaming AI response.
        
        Uses Server-Sent Events (SSE) to receive tokens incrementally.
        
        Args:
            session_id: ID of the session
            content: Message content
            handler: StreamHandler with callbacks for tokens, session_state, complete, error
            
        Returns:
            Tuple of (final_message_data, error_message) - only the complete data is returned
        """
        url = f"{self.BASE_URL}/api/sessions/{session_id}/messages/stream"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json={"content": content},
                    headers=self.get_headers()
                ) as response:
                    if response.status_code == 200:
                        full_content = ""
                        complete_data = None
                        
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data_str = line[6:]  # Remove "data: " prefix
                                try:
                                    data = json.loads(data_str)
                                    
                                    if data.get("type") == "token":
                                        token = data.get("content", "")
                                        full_content += token
                                        if handler.on_token:
                                            await handler.on_token(token)
                                    
                                    elif data.get("type") == "session_state":
                                        if handler.on_session_state:
                                            await handler.on_session_state(data.get("state", ""))
                                    
                                    elif data.get("type") == "complete":
                                        complete_data = {
                                            "id": data.get("message_id"),
                                            "session_id": session_id,
                                            "role": "assistant",
                                            "content": data.get("content", ""),
                                            "session_state": data.get("session_state", ""),
                                        }
                                        if handler.on_complete:
                                            await handler.on_complete(complete_data)
                                    
                                    elif data.get("type") == "error":
                                        error_msg = data.get("error", "Unknown error")
                                        if handler.on_error:
                                            await handler.on_error(error_msg)
                                        return None, error_msg
                                        
                                except json.JSONDecodeError:
                                    continue
                        
                        return complete_data, None
                    elif response.status_code == 401:
                        return None, "Invalid or expired token"
                    else:
                        return None, f"Server error (status {response.status_code})"
                        
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def end_session(self, session_id: str, summary: Optional[str] = None) -> tuple[Optional[dict], Optional[str]]:
        """
        End a session.
        
        Args:
            session_id: ID of the session
            summary: Optional summary for the session
            
        Returns:
            Tuple of (session_state_data, error_message)
        """
        if summary:
            return await self.post(f"/api/sessions/{session_id}/end?summary={summary}", {})
        return await self.post(f"/api/sessions/{session_id}/end", {})
    
    async def delete_session(self, session_id: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Delete a session.
        
        Args:
            session_id: ID of the session
            
        Returns:
            Tuple of (None, error_message) on error, (None, None) on success
        """
        return await self._delete(f"/api/sessions/{session_id}")
    
    async def get(self, path: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Make GET request to API.
        
        Args:
            path: API endpoint path (e.g., "/api/profile")
            
        Returns:
            Tuple of (response_data, error_message)
        """
        url = f"{self.BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 404:
                    return None, "Not found"
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def _delete(self, path: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Make DELETE request to API.
        
        Args:
            path: API endpoint path (e.g., "/api/sessions/123")
            
        Returns:
            Tuple of (response_data, error_message)
        """
        url = f"{self.BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    url,
                    headers=self.get_headers()
                )
                
                if response.status_code == 204:
                    return None, None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 404:
                    return None, "Not found"
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def put(self, path: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        """
        Make PUT request to API.
        
        Args:
            path: API endpoint path (e.g., "/api/profile")
            data: JSON data to send
            
        Returns:
            Tuple of (response_data, error_message)
        """
        url = f"{self.BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    url,
                    json=data,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 404:
                    return None, "Not found"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def transcribe_audio(
        self,
        audio_path: str,
        language: Optional[str] = None,
    ) -> tuple[Optional[dict], Optional[str]]:
        """
        Transcribe an audio file to text.
        
        Args:
            audio_path: Path to the audio file to transcribe
            language: Optional language code (e.g., 'en')
            
        Returns:
            Tuple of (transcription_data, error_message)
        """
        import os
        
        url = f"{self.BASE_URL}/api/stt/transcribe"
        
        if not os.path.exists(audio_path):
            return None, f"Audio file not found: {audio_path}"
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Prepare the file and form data
                with open(audio_path, "rb") as f:
                    files = {"file": (os.path.basename(audio_path), f, "audio/webm")}
                    data = {}
                    if language:
                        data["language"] = language
                    
                    response = await client.post(
                        url,
                        files=files,
                        data=data,
                        headers=self.get_headers()
                    )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def transcribe_bytes(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        language: Optional[str] = None,
    ) -> tuple[Optional[dict], Optional[str]]:
        """
        Transcribe audio from bytes.
        
        Args:
            audio_bytes: Raw audio bytes
            filename: Filename to use for the upload
            language: Optional language code (e.g., 'en')
            
        Returns:
            Tuple of (transcription_data, error_message)
        """
        url = f"{self.BASE_URL}/api/stt/transcribe"
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                files = {"file": (filename, audio_bytes, "audio/webm")}
                data = {}
                if language:
                    data["language"] = language
                
                response = await client.post(
                    url,
                    files=files,
                    data=data,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def synthesize_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> tuple[Optional[dict], Optional[str]]:
        """
        Synthesize text to speech audio.

        Args:
            text: Text to synthesize (max 5000 characters)
            voice_id: Optional voice ID to use

        Returns:
            Tuple of (audio_dict_with_base64, error_message)
            The audio_dict contains 'audio_base64' and 'mime_type' for playing in UI
        """
        import base64
        
        url = f"{self.BASE_URL}/api/tts/synthesize"
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Build query params
                params = {"text": text}
                if voice_id:
                    params["voice_id"] = voice_id
                
                response = await client.post(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {self._token}"} if self._token else {},
                )
                
                if response.status_code == 200:
                    # Response is WAV audio bytes
                    audio_bytes = response.content
                    # Encode to base64 for transferring to UI Audio player
                    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                    return {
                        "audio_base64": audio_b64,
                        "mime_type": "audio/wav",
                        "text": text,
                    }, None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                elif response.status_code == 404:
                    return None, "Voice not found"
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def export_data(self, format: str = "json") -> tuple[Optional[bytes], Optional[str]]:
        """
        Export user data as JSON or SQLite backup.
        
        Args:
            format: Export format - 'json' or 'sqlite'
            
        Returns:
            Tuple of (file_bytes, error_message)
            file_bytes is the raw file content to be saved
        """
        url = f"{self.BASE_URL}/api/settings/export?format={format}"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.content, None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                elif response.status_code == 400:
                    error_detail = response.json().get("detail", "Bad request")
                    return None, error_detail
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"
    
    async def clear_all_data(self) -> tuple[Optional[dict], Optional[str]]:
        """
        Clear all user data from the database.
        
        Returns:
            Tuple of (result_data, error_message)
        """
        url = f"{self.BASE_URL}/api/settings/clear-data"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    url,
                    headers=self.get_headers()
                )
                
                if response.status_code == 200:
                    return response.json(), None
                elif response.status_code == 401:
                    return None, "Invalid or expired token"
                else:
                    return None, f"Server error (status {response.status_code})"
                    
        except httpx.TimeoutException:
            return None, "Request timed out. Please try again."
        except httpx.ConnectError:
            return None, "Cannot connect to server. Please ensure the backend is running."
        except Exception as e:
            return None, f"Network error: {str(e)}"


# Global API client instance
api_client = APIClient()
