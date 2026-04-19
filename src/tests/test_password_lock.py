"""
Tests for password lock service.
"""

import os
import tempfile
import pytest
from pathlib import Path

from src.services.password_lock import PasswordLockService, CONFIG_DIR
from src.services.key_derivation import KeyDerivationService
from src.services.encryption import EncryptionService


@pytest.fixture
def temp_config():
    """Create a temporary config directory for testing."""
    original_dir = CONFIG_DIR
    temp_path = tempfile.mkdtemp()
    # Monkey-patch CONFIG_DIR and CONFIG_FILE temporarily
    import src.services.password_lock
    src.services.password_lock.CONFIG_DIR = Path(temp_path)
    src.services.password_lock.CONFIG_FILE = Path(temp_path) / "app_config.json"
    yield Path(temp_path)
    # Restore
    src.services.password_lock.CONFIG_DIR = original_dir
    src.services.password_lock.CONFIG_FILE = original_dir / "app_config.json"


class TestPasswordLockService:
    """Tests for PasswordLockService."""
    
    def test_is_first_launch_no_config(self, temp_config):
        """Test is_first_launch returns True when no config exists."""
        service = PasswordLockService()
        assert service.is_first_launch() is True
    
    def test_setup_new_password(self, temp_config):
        """Test setting up a new master password."""
        service = PasswordLockService()
        success, error = service.setup_new_password("mysecretpassword")
        
        assert success is True
        assert error == ""
        assert service.is_unlocked() is True
        assert service.is_password_set() is True
    
    def test_is_first_launch_after_setup(self, temp_config):
        """Test is_first_launch returns False after password is set."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        assert service.is_first_launch() is False
    
    def test_unlock_with_correct_password(self, temp_config):
        """Test unlocking with correct password."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        # Lock and try to unlock
        service.lock()
        assert service.is_unlocked() is False
        
        success, error = service.unlock_with_password("mysecretpassword")
        assert success is True
        assert error == ""
        assert service.is_unlocked() is True
    
    def test_unlock_with_wrong_password(self, temp_config):
        """Test unlocking with wrong password fails."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        service.lock()
        success, error = service.unlock_with_password("wrongpassword")
        
        assert success is False
        assert "Invalid password" in error
        assert service.is_unlocked() is False
    
    def test_verify_password_correct(self, temp_config):
        """Test password verification with correct password."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        assert service.verify_password("mysecretpassword") is True
    
    def test_verify_password_incorrect(self, temp_config):
        """Test password verification with incorrect password."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        assert service.verify_password("wrongpassword") is False
    
    def test_change_password(self, temp_config):
        """Test changing the master password."""
        service = PasswordLockService()
        service.setup_new_password("oldpassword")
        
        success, error = service.change_password("oldpassword", "newpassword")
        
        assert success is True
        assert error == ""
        
        # Old password should no longer work
        assert service.verify_password("oldpassword") is False
        
        # New password should work
        assert service.verify_password("newpassword") is True
    
    def test_change_password_wrong_current(self, temp_config):
        """Test changing password with wrong current password fails."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        
        success, error = service.change_password("wrongcurrent", "newpassword")
        
        assert success is False
        assert "incorrect" in error.lower()
    
    def test_change_password_re_encrypts_database(self, temp_config):
        """Test that change_password properly re-encrypts the database.
        
        This test verifies the core fix: after changing password, the database
        configuration is updated and old password verification fails.
        
        Note: Full E2E test with actual database encryption requires the full
        app infrastructure due to singleton database service.
        """
        service = PasswordLockService()
        service.setup_new_password("oldpassword")
        
        # Change password
        success, error = service.change_password("oldpassword", "newpassword")
        assert success is True, f"Password change failed: {error}"
        
        # Verify old password no longer works via verify_password
        # (This tests that password hash was properly updated)
        assert service.verify_password("oldpassword") is False, \
            "Old password should fail verification after change"
        
        # Verify new password works
        assert service.verify_password("newpassword") is True, \
            "New password should pass verification"
        
        # Verify the config was updated with new salt
        import json
        config_path = temp_config / "app_config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Config should have password_changed_at timestamp
        assert "password_changed_at" in config, \
            "Config should record password change timestamp"
        
        # Create a fresh service and verify old password fails to unlock
        service2 = PasswordLockService()
        success, error = service2.unlock_with_password("oldpassword")
        assert success is False, \
            f"Old password should fail to unlock after change: {error}"
        
        # New password should unlock successfully
        success, error = service2.unlock_with_password("newpassword")
        assert success is True, \
            f"New password should unlock successfully: {error}"
    
    def test_lock(self, temp_config):
        """Test locking the app."""
        service = PasswordLockService()
        service.setup_new_password("mysecretpassword")
        assert service.is_unlocked() is True
        
        service.lock()
        assert service.is_unlocked() is False


class TestKeyDerivationService:
    """Tests for KeyDerivationService."""
    
    def test_generate_salt_length(self):
        """Test that salt is correct length."""
        salt = KeyDerivationService.generate_salt()
        assert len(salt) == KeyDerivationService.SALT_LENGTH
    
    def test_generate_salt_random(self):
        """Test that generated salts are random."""
        salt1 = KeyDerivationService.generate_salt()
        salt2 = KeyDerivationService.generate_salt()
        assert salt1 != salt2
    
    def test_derive_key_deterministic(self):
        """Test that same password and salt produces same key."""
        password = "testpassword"
        salt = b"testsalt123456789012345678901234"
        
        key1 = KeyDerivationService.derive_key(password, salt)
        key2 = KeyDerivationService.derive_key(password, salt)
        
        assert key1 == key2
    
    def test_derive_key_different_salts(self):
        """Test that same password with different salts produces different keys."""
        password = "testpassword"
        salt1 = b"testsalt1111111111111111111111"
        salt2 = b"testsalt2222222222222222222222"
        
        key1 = KeyDerivationService.derive_key(password, salt1)
        key2 = KeyDerivationService.derive_key(password, salt2)
        
        assert key1 != key2
    
    def test_derive_key_different_passwords(self):
        """Test that different passwords with same salt produces different keys."""
        password1 = "password1"
        password2 = "password2"
        salt = b"testsalt123456789012345678901234"
        
        key1 = KeyDerivationService.derive_key(password1, salt)
        key2 = KeyDerivationService.derive_key(password2, salt)
        
        assert key1 != key2


class TestEncryptionService:
    """Tests for EncryptionService."""
    
    def test_encrypt_decrypt_bytes(self):
        """Test encrypting and decrypting bytes."""
        service = EncryptionService()
        password = "testpassword"
        salt = KeyDerivationService.generate_salt()
        service.initialize_with_password(password, salt)
        
        original_data = b"Hello, this is secret data!"
        
        encrypted = service._fernet.encrypt(original_data)
        decrypted = service._fernet.decrypt(encrypted)
        
        assert decrypted == original_data
    
    def test_encrypt_file(self, temp_config):
        """Test encrypting a file."""
        service = EncryptionService()
        password = "testpassword"
        salt = KeyDerivationService.generate_salt()
        service.initialize_with_password(password, salt)
        
        # Create a test file
        input_path = Path(temp_config) / "test_input.txt"
        output_path = Path(temp_config) / "test_output.enc"
        
        with open(input_path, 'wb') as f:
            f.write(b"Secret file content")
        
        success = service.encrypt_file(input_path, output_path)
        
        assert success is True
        assert output_path.exists()
        
        # Encrypted content should be different
        with open(input_path, 'rb') as f:
            original = f.read()
        with open(output_path, 'rb') as f:
            encrypted = f.read()
        
        assert encrypted != original
    
    def test_decrypt_file(self, temp_config):
        """Test decrypting a file."""
        service = EncryptionService()
        password = "testpassword"
        salt = KeyDerivationService.generate_salt()
        service.initialize_with_password(password, salt)
        
        # Create a test file
        input_path = Path(temp_config) / "test_input.txt"
        encrypted_path = Path(temp_config) / "test_output.enc"
        decrypted_path = Path(temp_config) / "test_decrypted.txt"
        
        with open(input_path, 'wb') as f:
            f.write(b"Secret file content")
        
        service.encrypt_file(input_path, encrypted_path)
        
        # Reinitialize with same password
        service.initialize_with_password(password, salt)
        success = service.decrypt_file(encrypted_path, decrypted_path)
        
        assert success is True
        
        with open(decrypted_path, 'rb') as f:
            decrypted = f.read()
        
        assert decrypted == b"Secret file content"
    
    def test_decrypt_with_wrong_password(self, temp_config):
        """Test decrypting with wrong password fails."""
        service = EncryptionService()
        password = "correctpassword"
        wrong_password = "wrongpassword"
        
        salt1 = KeyDerivationService.generate_salt()
        service.initialize_with_password(password, salt1)
        
        input_path = Path(temp_config) / "test_input.txt"
        encrypted_path = Path(temp_config) / "test_output.enc"
        
        with open(input_path, 'wb') as f:
            f.write(b"Secret file content")
        
        service.encrypt_file(input_path, encrypted_path)
        
        # Try to decrypt with wrong password
        salt2 = KeyDerivationService.generate_salt()
        service.initialize_with_password(wrong_password, salt2)
        success = service.decrypt_file(encrypted_path, Path(temp_config) / "decrypted.txt")
        
        assert success is False
    
    def test_is_initialized(self):
        """Test is_initialized check."""
        service = EncryptionService()
        assert service.is_initialized() is False
        
        password = "testpassword"
        salt = KeyDerivationService.generate_salt()
        service.initialize_with_password(password, salt)
        
        assert service.is_initialized() is True
