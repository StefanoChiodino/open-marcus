"""
JWT token service for authentication.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str
    username: str
    exp: Optional[datetime] = None


class Token(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str = "bearer"


class JWTService:
    """Service for JWT token generation and validation."""
    
    # Algorithm for JWT signing
    ALGORITHM = "HS256"
    
    def __init__(self, secret_key: Optional[str] = None, expire_minutes: int = 60 * 24):
        """
        Initialize JWT service.
        
        Args:
            secret_key: Secret key for signing tokens. If None, uses environment variable or default.
            expire_minutes: Token expiration time in minutes. Default 24 hours.
        """
        if secret_key is None:
            secret_key = os.environ.get("JWT_SECRET_KEY", "openMarcus-dev-secret-key-change-in-production")
        
        self.secret_key = secret_key
        self.expire_minutes = expire_minutes
    
    def create_access_token(self, user_id: str, username: str) -> str:
        """
        Create a new JWT access token.
        
        Args:
            user_id: User's unique identifier
            username: User's username
            
        Returns:
            Encoded JWT token string
        """
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.expire_minutes)
        
        payload = {
            "user_id": user_id,
            "username": username,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        
        token = jwt.encode(payload, self.secret_key, algorithm=self.ALGORITHM)
        return token
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            TokenData if valid, None if invalid or expired
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.ALGORITHM])
            user_id = payload.get("user_id")
            username = payload.get("username")
            exp = payload.get("exp")
            
            if user_id is None or username is None:
                return None
            
            return TokenData(
                user_id=user_id,
                username=username,
                exp=datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
            )
        except JWTError:
            return None
    
    def get_user_id_from_token(self, token: str) -> Optional[str]:
        """
        Extract user_id from a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            User ID if token is valid, None otherwise
        """
        token_data = self.verify_token(token)
        if token_data:
            return token_data.user_id
        return None


# Global instance
jwt_service = JWTService()
