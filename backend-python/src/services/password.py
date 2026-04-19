"""
Password hashing service using argon2.
"""

from passlib.hash import argon2


class PasswordService:
    """Service for password hashing and verification using argon2."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using argon2.
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        return argon2.hash(password)
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """
        Verify a password against a hash.
        
        Args:
            password: Plain text password
            password_hash: Stored hash
            
        Returns:
            True if password matches, False otherwise
        """
        return argon2.verify(password, password_hash)


# Global instance
password_service = PasswordService()
