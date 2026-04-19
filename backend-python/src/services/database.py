"""
Database service for SQLAlchemy management with optional encryption.
"""

import os
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from ..models import Base
from .encryption import EncryptionService


# Default database paths
DATA_DIR = Path("/Users/stefano/repos/open-marcus/data")
DEFAULT_DB_FILE = DATA_DIR / "openMarcus.db"
ENCRYPTED_DB_FILE = DATA_DIR / "openMarcus.db.enc"


class DatabaseService:
    """Manages database connections and session lifecycle with encryption support."""
    
    def __init__(
        self,
        database_url: Optional[str] = None,
        encryption_service: Optional[EncryptionService] = None
    ):
        """
        Initialize the database service.
        
        Args:
            database_url: SQLite database URL. If None, uses default location.
            encryption_service: Optional encryption service for encrypted databases.
        """
        if database_url is None:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            database_url = f"sqlite:///{DEFAULT_DB_FILE}"
        
        self.database_url = database_url
        self.engine: Optional[Engine] = None
        self._session_factory = None
        self.encryption_service: Optional["EncryptionService"] = encryption_service
        self._db_file_path: Optional[Path] = None
        
        # Extract file path for encryption
        if database_url.startswith("sqlite:///"):
            self._db_file_path = Path(database_url[len("sqlite:///") - 1:])
            if self._db_file_path.name == "openMarcus.db" and str(self._db_file_path).startswith("/Users"):
                pass  # Already a path
            elif not self._db_file_path.is_absolute():
                self._db_file_path = DATA_DIR / database_url[len("sqlite:///"):]
        
        self._create_engine()
    
    def _create_engine(self) -> None:
        """Create the SQLAlchemy engine."""
        self.engine = create_engine(
            self.database_url,
            connect_args={"check_same_thread": False} if "sqlite" in self.database_url else {},
            poolclass=StaticPool if "sqlite" in self.database_url else None,
            echo=False,
        )
        self._session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
    
    def create_tables(self) -> None:
        """Create all tables defined in models."""
        Base.metadata.create_all(self.engine)
    
    def drop_tables(self) -> None:
        """Drop all tables (use with caution!)."""
        Base.metadata.drop_all(self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session."""
        if self._session_factory is None:
            self._create_engine()
        return self._session_factory()
    
    def close(self) -> None:
        """Close the database engine."""
        if self.engine:
            self.engine.dispose()
            self.engine = None
            self._session_factory = None
    
    def __enter__(self) -> "DatabaseService":
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit - close database."""
        self.close()
    
    def get_database_file_path(self) -> Optional[Path]:
        """Get the path to the actual database file."""
        return self._db_file_path
    
    def get_encrypted_file_path(self) -> Path:
        """Get the path to the encrypted database file."""
        return ENCRYPTED_DB_FILE
    
    def is_encrypted(self) -> bool:
        """Check if the database is currently encrypted (i.e., .enc file exists but .db does not)."""
        return ENCRYPTED_DB_FILE.exists() and not self._db_file_path.exists()
    
    def encrypt_database(self, encrypted_path: Optional[Path] = None) -> bool:
        """
        Encrypt the database file to a backup location.
        
        Args:
            encrypted_path: Path for encrypted file. If None, uses .enc extension.
            
        Returns:
            True if successful, False otherwise
        """
        if not self._db_file_path or not self._db_file_path.exists():
            return False
        
        if not self.encryption_service or not self.encryption_service.is_initialized():
            return False
        
        if encrypted_path is None:
            encrypted_path = ENCRYPTED_DB_FILE
        
        return self.encryption_service.encrypt_file(self._db_file_path, encrypted_path)
    
    def decrypt_database(self, encrypted_path: Optional[Path] = None, target_path: Optional[Path] = None) -> bool:
        """
        Decrypt the database file from encrypted backup.
        
        Args:
            encrypted_path: Path to encrypted file. If None, uses default .enc path.
            target_path: Path for decrypted file. If None, uses default .db path.
            
        Returns:
            True if successful, False otherwise
        """
        if not self.encryption_service or not self.encryption_service.is_initialized():
            return False
        
        if encrypted_path is None:
            encrypted_path = ENCRYPTED_DB_FILE
        
        if target_path is None:
            target_path = DEFAULT_DB_FILE
        
        if not encrypted_path.exists():
            return False
        
        # Decrypt to target path
        success = self.encryption_service.decrypt_file(encrypted_path, target_path)
        
        if success:
            # Update database_url to point to decrypted file
            self.database_url = f"sqlite:///{target_path}"
            self._db_file_path = target_path
            self._create_engine()
        
        return success
    
    def decrypt_to_db(self) -> bool:
        """
        Decrypt the encrypted database to the working .db file.
        
        Returns:
            True if successful, False otherwise
        """
        if self._db_file_path is None:
            return False
        # Compute encrypted path from the same base as the db file
        encrypted_path = self._db_file_path.with_suffix(self._db_file_path.suffix + ".enc")
        return self.decrypt_database(encrypted_path, self._db_file_path)
    
    def encrypt_from_db(self) -> bool:
        """
        Encrypt the working .db file to the encrypted backup.
        After encryption, removes the unencrypted .db file.
        
        Returns:
            True if successful, False otherwise
        """
        if self._db_file_path is None:
            return False
        
        # Use .enc suffix alongside the actual database file
        encrypted_path = self._db_file_path.with_suffix(self._db_file_path.suffix + ".enc")
        success = self.encrypt_database(encrypted_path)
        
        if success and self._db_file_path.exists():
            # Remove the unencrypted file after successful encryption
            try:
                os.remove(self._db_file_path)
            except OSError:
                pass
        
        return success


# Global database service instance
_db_service: Optional[DatabaseService] = None


def get_database_service() -> DatabaseService:
    """Get or create the global database service instance."""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service


def init_database(database_url: Optional[str] = None) -> DatabaseService:
    """Initialize the database, create tables, return service."""
    service = DatabaseService(database_url)
    service.create_tables()
    global _db_service
    _db_service = service
    return service
