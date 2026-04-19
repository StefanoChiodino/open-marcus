"""
App-level password lock service.
Manages master password for encrypting/decrypting the database.
"""

import os
import json
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

from .key_derivation import KeyDerivationService, key_derivation_service
from .encryption import EncryptionService, encryption_service
from .password import PasswordService


# Configuration file stored alongside database
CONFIG_DIR = Path("/Users/stefano/repos/open-marcus/data")
CONFIG_FILE = CONFIG_DIR / "app_config.json"


class PasswordLockService:
    """
    Service for managing app-level password lock.
    
    On first launch, user sets a master password.
    On subsequent launches, this password is required to access the database.
    The password is used to derive an encryption key that encrypts the database.
    """
    
    def __init__(
        self,
        key_derivation: Optional[KeyDerivationService] = None,
        encryption: Optional[EncryptionService] = None,
        password_service: Optional[PasswordService] = None
    ):
        """
        Initialize password lock service.
        
        Args:
            key_derivation: Key derivation service
            encryption: Encryption service
            password_service: Password hashing service
        """
        self.key_derivation = key_derivation or key_derivation_service
        self.encryption = encryption or encryption_service
        self.password_service = password_service or PasswordService()
        self._is_unlocked: bool = False
        self._salt: Optional[bytes] = None
        self._password_hash: Optional[str] = None
    
    def _ensure_config_dir(self) -> None:
        """Ensure config directory exists."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self) -> dict:
        """Load app configuration from disk."""
        self._ensure_config_dir()
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_config(self, config: dict) -> None:
        """Save app configuration to disk."""
        self._ensure_config_dir()
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    
    def is_first_launch(self) -> bool:
        """
        Check if this is a first launch (no password set).
        
        Returns:
            True if no master password has been set, False otherwise
        """
        config = self._load_config()
        return "password_hash" not in config or not config["password_hash"]
    
    def is_unlocked(self) -> bool:
        """Check if app is currently unlocked."""
        return self._is_unlocked
    
    def get_salt(self) -> Optional[bytes]:
        """Get the current salt."""
        return self._salt
    
    def setup_new_password(self, password: str) -> Tuple[bool, str]:
        """
        Set up a new master password on first launch.
        
        Args:
            password: The master password to set
            
        Returns:
            Tuple of (success, error_message)
        """
        if not self.is_first_launch():
            return False, "Password already set. Cannot set new password."
        
        # Generate salt for key derivation
        salt = self.key_derivation.generate_salt()
        
        # Hash password for verification (stored in config)
        password_hash = self.password_service.hash_password(password)
        
        # Initialize encryption with derived key
        self.key_derivation.derive_key_with_salt_password(password, salt)
        self.encryption.initialize_with_password(password, salt)
        
        # Save salt and password hash to config
        config = {
            "password_hash": password_hash,
            "salt": salt.hex(),
            "created_at": datetime.utcnow().isoformat(),
            "db_encrypted": True
        }
        self._save_config(config)
        
        self._salt = salt
        self._password_hash = password_hash
        self._is_unlocked = True
        
        return True, ""
    
    def unlock_with_password(self, password: str) -> Tuple[bool, str]:
        """
        Unlock the app with the master password.
        
        Args:
            password: The master password
            
        Returns:
            Tuple of (success, error_message)
        """
        config = self._load_config()
        
        if "password_hash" not in config:
            return False, "No password configured"
        
        password_hash = config["password_hash"]
        salt_hex = config.get("salt", "")
        
        if not salt_hex:
            return False, "Salt not found in configuration"
        
        # Verify password against stored hash
        if not self.password_service.verify_password(password, password_hash):
            return False, "Invalid password"
        
        # Derive key and initialize encryption
        salt = bytes.fromhex(salt_hex)
        self._salt = salt
        self._password_hash = password_hash
        self.encryption.initialize_with_password(password, salt)
        self._is_unlocked = True
        
        return True, ""
    
    def lock(self) -> None:
        """Lock the app (require password to unlock again)."""
        self._is_unlocked = False
        self.encryption._fernet = None
        self.encryption._derived_key = None
    
    def verify_password(self, password: str) -> bool:
        """
        Verify if the given password is correct.
        
        Args:
            password: Password to verify
            
        Returns:
            True if password is correct, False otherwise
        """
        if not self._password_hash:
            config = self._load_config()
            if "password_hash" not in config:
                return False
            self._password_hash = config["password_hash"]
        
        return self.password_service.verify_password(password, self._password_hash)
    
    def change_password(self, current_password: str, new_password: str) -> Tuple[bool, str]:
        """
        Change the master password.
        
        Args:
            current_password: Current password for verification
            new_password: New password to set
            
        Returns:
            Tuple of (success, error_message)
        """
        if not self.verify_password(current_password):
            return False, "Current password is incorrect"
        
        # Generate new salt
        new_salt = self.key_derivation.generate_salt()
        
        # Hash new password
        new_password_hash = self.password_service.hash_password(new_password)
        
        # Update config
        config = self._load_config()
        config["password_hash"] = new_password_hash
        config["salt"] = new_salt.hex()
        config["password_changed_at"] = datetime.utcnow().isoformat()
        self._save_config(config)
        
        # Re-initialize encryption with new key
        self._salt = new_salt
        self._password_hash = new_password_hash
        self.encryption.initialize_with_password(new_password, new_salt)
        
        return True, ""
    
    def is_password_set(self) -> bool:
        """
        Check if a master password has been set.
        
        Returns:
            True if password is set, False otherwise
        """
        config = self._load_config()
        return "password_hash" in config and bool(config["password_hash"])


# Global instance
password_lock_service = PasswordLockService()
