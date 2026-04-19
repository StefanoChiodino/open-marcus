"""
Key derivation service using PBKDF2.
"""

import os
import base64
from typing import Optional

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


class KeyDerivationService:
    """Service for deriving encryption keys from passwords using PBKDF2."""
    
    SALT_LENGTH = 32
    KEY_LENGTH = 32  # 256 bits for Fernet
    ITERATIONS = 480000  # OWASP recommended for PBKDF2-SHA256
    
    @staticmethod
    def generate_salt() -> bytes:
        """
        Generate a random salt for key derivation.
        
        Returns:
            Random salt bytes
        """
        return os.urandom(KeyDerivationService.SALT_LENGTH)
    
    @staticmethod
    def derive_key(password: str, salt: bytes) -> bytes:
        """
        Derive an encryption key from password using PBKDF2.
        
        Args:
            password: The master password
            salt: Random salt for key derivation
            
        Returns:
            Derived key bytes
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=KeyDerivationService.KEY_LENGTH,
            salt=salt,
            iterations=KeyDerivationService.ITERATIONS,
            backend=default_backend()
        )
        return kdf.derive(password.encode('utf-8'))
    
    @staticmethod
    def derive_key_with_salt_password(password: str, salt: bytes) -> bytes:
        """
        Derive an encryption key from password and salt.
        
        Args:
            password: The master password
            salt: Salt bytes
            
        Returns:
            Derived key as base64 string for Fernet
        """
        key = KeyDerivationService.derive_key(password, salt)
        return base64.urlsafe_b64encode(key)


# Global instance
key_derivation_service = KeyDerivationService()
