"""
Authentication service handling user registration and login.
"""

from typing import Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..models import User
from .password import PasswordService
from .jwt import JWTService, Token


class AuthService:
    """Service for user authentication operations."""
    
    def __init__(
        self,
        password_service: Optional[PasswordService] = None,
        jwt_service: Optional[JWTService] = None
    ):
        """
        Initialize auth service.
        
        Args:
            password_service: Password hashing service. If None, uses default.
            jwt_service: JWT service. If None, uses default.
        """
        self.password_service = password_service or PasswordService()
        self.jwt_service = jwt_service or JWTService()
    
    def create_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """
        Create a new user with hashed password.
        
        Args:
            db: Database session
            username: User's username
            password: Plain text password (will be hashed)
            
        Returns:
            Created User object, or None if username already exists
        """
        # Check if username exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            return None
        
        # Hash password
        password_hash = self.password_service.hash_password(password)
        
        # Create user
        user = User(
            username=username,
            password_hash=password_hash,
            created_at=datetime.utcnow()
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
            return None
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[Token]:
        """
        Authenticate user and return JWT token.
        
        Args:
            db: Database session
            username: User's username
            password: Plain text password
            
        Returns:
            Token object with JWT if credentials valid, None otherwise
        """
        user = db.query(User).filter(User.username == username).first()
        
        if user is None:
            return None
        
        if not self.password_service.verify_password(password, user.password_hash):
            return None
        
        # Generate token
        access_token = self.jwt_service.create_access_token(
            user_id=user.id,
            username=user.username
        )
        
        return Token(access_token=access_token)
    
    def get_user_by_id(self, db: Session, user_id: str) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            db: Database session
            user_id: User's unique identifier
            
        Returns:
            User object if found, None otherwise
        """
        return db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """
        Get user by username.
        
        Args:
            db: Database session
            username: User's username
            
        Returns:
            User object if found, None otherwise
        """
        return db.query(User).filter(User.username == username).first()


# Global instance
auth_service = AuthService()
