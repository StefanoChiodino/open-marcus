"""
Encryption service for database file encryption.
Uses Fernet (AES-128-CBC with HMAC) for symmetric encryption.
"""

from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from .key_derivation import KeyDerivationService


class EncryptionService:
    """Service for encrypting and decrypting database files."""
    
    ENCRYPTED_EXTENSION = ".enc"
    ORIGINAL_EXTENSION = ".db"
    
    def __init__(self, key_derivation_service: Optional[KeyDerivationService] = None):
        """
        Initialize encryption service.
        
        Args:
            key_derivation_service: Key derivation service. If None, uses default.
        """
        self.key_derivation = key_derivation_service or KeyDerivationService()
        self._fernet: Optional[Fernet] = None
        self._derived_key: Optional[bytes] = None
    
    def initialize_with_password(self, password: str, salt: bytes) -> None:
        """
        Initialize encryption with a derived key from password.
        
        Args:
            password: Master password
            salt: Salt for key derivation
        """
        key = self.key_derivation.derive_key_with_salt_password(password, salt)
        self._fernet = Fernet(key)
        self._derived_key = key
    
    def is_initialized(self) -> bool:
        """Check if encryption service is initialized with a key."""
        return self._fernet is not None
    
    def encrypt_file(self, input_path: Path, output_path: Path) -> bool:
        """
        Encrypt a file using Fernet.
        
        Args:
            input_path: Path to file to encrypt
            output_path: Path where encrypted file will be saved
            
        Returns:
            True if successful, False otherwise
        """
        if not self._fernet:
            raise RuntimeError("Encryption service not initialized. Call initialize_with_password first.")
        
        try:
            with open(input_path, 'rb') as f:
                data = f.read()
            
            encrypted_data = self._fernet.encrypt(data)
            
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
            
            return True
        except Exception as e:
            print(f"Encryption error: {e}")
            return False
    
    def decrypt_file(self, input_path: Path, output_path: Path) -> bool:
        """
        Decrypt a file using Fernet.
        
        Args:
            input_path: Path to encrypted file
            output_path: Path where decrypted file will be saved
            
        Returns:
            True if successful, False otherwise
        """
        if not self._fernet:
            raise RuntimeError("Encryption service not initialized. Call initialize_with_password first.")
        
        try:
            with open(input_path, 'rb') as f:
                encrypted_data = f.read()
            
            decrypted_data = self._fernet.decrypt(encrypted_data)
            
            with open(output_path, 'wb') as f:
                f.write(decrypted_data)
            
            return True
        except InvalidToken:
            print("Decryption error: Invalid password or corrupted file")
            return False
        except Exception as e:
            print(f"Decryption error: {e}")
            return False
    
    def decrypt_file_to_memory(self, input_path: Path) -> Optional[bytes]:
        """
        Decrypt a file directly to memory.
        
        Args:
            input_path: Path to encrypted file
            
        Returns:
            Decrypted bytes if successful, None otherwise
        """
        if not self._fernet:
            raise RuntimeError("Encryption service not initialized. Call initialize_with_password first.")
        
        try:
            with open(input_path, 'rb') as f:
                encrypted_data = f.read()
            
            return self._fernet.decrypt(encrypted_data)
        except InvalidToken:
            print("Decryption error: Invalid password or corrupted file")
            return None
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
    
    @staticmethod
    def encrypt_bytes(data: bytes, fernet: Fernet) -> bytes:
        """
        Encrypt bytes using Fernet.
        
        Args:
            data: Bytes to encrypt
            fernet: Fernet instance
            
        Returns:
            Encrypted bytes
        """
        return fernet.encrypt(data)
    
    @staticmethod
    def decrypt_bytes(encrypted_data: bytes, fernet: Fernet) -> bytes:
        """
        Decrypt bytes using Fernet.
        
        Args:
            encrypted_data: Encrypted bytes
            fernet: Fernet instance
            
        Returns:
            Decrypted bytes
        """
        return fernet.decrypt(encrypted_data)


# Global instance
encryption_service = EncryptionService()
