"""
API Client for OpenMarcus backend communication.
"""

import httpx
from typing import Optional


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


# Global API client instance
api_client = APIClient()
