"""
Tests for encrypted database workflow.
Verifies VAL-PRIVACY-002: Database is encrypted using password-derived key.
"""

import os
import tempfile
import uuid
import pytest
from pathlib import Path

from src.services.key_derivation import KeyDerivationService
from src.services.encryption import EncryptionService
from src.services.database import DatabaseService
from src.models import User


class TestEncryptedDatabaseWorkflow:
    """Tests for encrypted database workflow."""
    
    @pytest.fixture
    def temp_dir(self, tmp_path):
        """Create a temporary directory for testing."""
        temp_dir = tmp_path / "encryption_test"
        temp_dir.mkdir()
        yield temp_dir
        # Cleanup
        for f in temp_dir.iterdir():
            if f.is_file():
                f.unlink()
    
    def test_database_encrypted_file_is_unreadable(self, temp_dir):
        """Test that encrypted database file cannot be read as plaintext."""
        # Setup encryption
        key_derivation = KeyDerivationService()
        encryption = EncryptionService()
        password = "testpassword123"
        salt = key_derivation.generate_salt()
        encryption.initialize_with_password(password, salt)
        
        # Create a database with some data
        db_path = temp_dir / "test.db"
        db_service = DatabaseService(f"sqlite:///{db_path}")
        db_service.encryption_service = encryption
        db_service.create_tables()
        
        session = db_service.get_session()
        user = User(id=str(uuid.uuid4()), username="testuser", password_hash="hash")
        session.add(user)
        session.commit()
        session.close()
        
        # Encrypt the database
        encrypted_path = temp_dir / "test.db.enc"
        success = db_service.encrypt_database(encrypted_path)
        assert success is True
        
        # Remove original
        os.remove(db_path)
        
        # Verify encrypted file cannot be read as SQLite
        with open(encrypted_path, 'rb') as f:
            header = f.read(16)
        
        # SQLite files start with "SQLite format 3\000" but encrypted files don't
        assert b"SQLite" not in header, "Encrypted file should not contain SQLite header"
        
        # Verify we can decrypt it back
        db_service2 = DatabaseService(f"sqlite:///{db_path}")
        db_service2.encryption_service = encryption
        success = db_service2.decrypt_database(encrypted_path, db_path)
        assert success is True
        
        # Verify data is accessible
        session2 = db_service2.get_session()
        result = session2.query(User).filter_by(username="testuser").first()
        assert result is not None
        session2.close()
    
    def test_encryption_service_encrypt_decrypt_bytes(self):
        """Test basic encryption/decryption of bytes."""
        key_derivation = KeyDerivationService()
        encryption = EncryptionService()
        password = "testpassword"
        salt = key_derivation.generate_salt()
        encryption.initialize_with_password(password, salt)
        
        original_data = b"Hello, this is secret data!"
        
        # Encrypt
        fernet = encryption._fernet
        encrypted = fernet.encrypt(original_data)
        
        # Decrypt
        decrypted = fernet.decrypt(encrypted)
        
        assert decrypted == original_data
        assert encrypted != original_data
    
    def test_encryption_with_different_salt_produces_different_key(self):
        """Test that different salts produce different encryption keys."""
        password = "samepassword"
        
        key_derivation = KeyDerivationService()
        salt1 = key_derivation.generate_salt()
        salt2 = key_derivation.generate_salt()
        
        enc1 = EncryptionService()
        enc1.initialize_with_password(password, salt1)
        
        enc2 = EncryptionService()
        enc2.initialize_with_password(password, salt2)
        
        data = b"Test data"
        
        # Same password, different salts -> different encrypted output
        encrypted1 = enc1._fernet.encrypt(data)
        encrypted2 = enc2._fernet.encrypt(data)
        
        assert encrypted1 != encrypted2
    
    def test_wrong_key_cannot_decrypt(self):
        """Test that using wrong key cannot decrypt."""
        key_derivation = KeyDerivationService()
        
        # Setup correct encryption
        correct_enc = EncryptionService()
        correct_password = "correctpassword"
        salt = key_derivation.generate_salt()
        correct_enc.initialize_with_password(correct_password, salt)
        
        # Create and encrypt a file
        db_path = Path(tempfile.mktemp(suffix=".db"))
        try:
            db_service = DatabaseService(f"sqlite:///{db_path}")
            db_service.encryption_service = correct_enc
            db_service.create_tables()
            
            session = db_service.get_session()
            user = User(id=str(uuid.uuid4()), username="secretuser", password_hash="hash")
            session.add(user)
            session.commit()
            session.close()
            
            encrypted_path = Path(tempfile.mktemp(suffix=".enc"))
            success = db_service.encrypt_database(encrypted_path)
            assert success is True
            
            os.remove(db_path)
            
            # Try to decrypt with wrong password
            wrong_enc = EncryptionService()
            wrong_salt = key_derivation.generate_salt()
            wrong_enc.initialize_with_password("wrongpassword", wrong_salt)
            
            db_service2 = DatabaseService(f"sqlite:///{db_path}")
            db_service2.encryption_service = wrong_enc
            success = db_service2.decrypt_database(encrypted_path, db_path)
            
            assert success is False, "Decryption with wrong password should fail"
        finally:
            # Cleanup
            for p in [db_path, encrypted_path]:
                if p.exists():
                    os.remove(p)
    
    def test_database_service_encrypt_from_db_removes_plaintext(self, temp_dir):
        """Test that encrypt_from_db removes the plaintext file."""
        key_derivation = KeyDerivationService()
        encryption = EncryptionService()
        password = "testpassword"
        salt = key_derivation.generate_salt()
        encryption.initialize_with_password(password, salt)
        
        # Create database
        db_path = temp_dir / "test.db"
        db_service = DatabaseService(f"sqlite:///{db_path}")
        db_service.encryption_service = encryption
        db_service.create_tables()
        
        session = db_service.get_session()
        user = User(id=str(uuid.uuid4()), username="user1", password_hash="hash")
        session.add(user)
        session.commit()
        session.close()
        
        assert db_path.exists(), "Plaintext database should exist before encryption"
        
        # Encrypt - this should remove the plaintext
        success = db_service.encrypt_from_db()
        assert success is True
        
        assert not db_path.exists(), "Plaintext database should be removed after encryption"
        
        encrypted_path = temp_dir / "test.db.enc"
        assert encrypted_path.exists(), "Encrypted file should exist"
