"""
Database service for SQLAlchemy management.
"""

import os
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from ..models import Base


class DatabaseService:
    """Manages database connections and session lifecycle."""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize the database service.
        
        Args:
            database_url: SQLite database URL. If None, uses default location.
        """
        if database_url is None:
            # Default to data directory in repo root
            data_dir = Path("/Users/stefano/repos/open-marcus/data")
            data_dir.mkdir(exist_ok=True)
            database_url = f"sqlite:///{data_dir}/openMarcus.db"
        
        self.database_url = database_url
        self.engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
            poolclass=StaticPool if "sqlite" in database_url else None,
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
        return self._session_factory()
    
    def close(self) -> None:
        """Close the database engine."""
        self.engine.dispose()
    
    def __enter__(self) -> "DatabaseService":
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit - close database."""
        self.close()


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
