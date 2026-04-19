"""
Database service for SQLAlchemy management with optional encryption.
"""

import os
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from ..models import Base
from .encryption import EncryptionService


class DatabaseService:
    """Manages database connections and session lifecycle."""
    
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
            # Default to data directory in repo root
            data_dir = Path("/Users/stefano/repos/open-marcus/data")
            data_dir.mkdir(exist_ok=True)
            database_url = f"sqlite:///{data_dir}/openMarcus.db"
        
        self.database_url = database_url
        self.engine = None
        self._session_factory = None
        self.encryption_service = encryption_service
        self._db_file_path: Optional[Path] = None
        
        # Extract file path for encryption
        if database_url.startswith("sqlite:///"):
            self._db_file_path = Path(database_url[len("sqlite:///") - 1:])
            if self._db_file_path.name == "openMarcus.db" and str(self._db_file_path).startswith("/Users"):
                pass  # Already a path
            elif not self._db_file_path.is_absolute():
                self._db_file_path = Path("/Users/stefano/repos/open-marcus/data") / database_url[len("sqlite:///"):]
        
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
            encrypted_path = self._db_file_path.with_suffix(self._db_file_path.suffix + ".enc")
        
        return self.encryption_service.encrypt_file(self._db_file_path, encrypted_path)
    
    def decrypt_database(self, encrypted_path: Path, target_path: Optional[Path] = None) -> bool:
        """
        Decrypt the database file from encrypted backup.
        
        Args:
            encrypted_path: Path to encrypted file.
            target_path: Path for decrypted file. If None, overwrites original.
            
        Returns:
            True if successful, False otherwise
        """
        if not self.encryption_service or not self.encryption_service.is_initialized():
            return False
        
        if target_path is None and self._db_file_path:
            target_path = self._db_file_path
        
        if target_path is None:
            return False
        
        # Decrypt to target path
        success = self.encryption_service.decrypt_file(encrypted_path, target_path)
        
        if success:
            # Update database_url to point to decrypted file
            self.database_url = f"sqlite:///{target_path}"
            self._db_file_path = target_path
            self._create_engine()
        
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
