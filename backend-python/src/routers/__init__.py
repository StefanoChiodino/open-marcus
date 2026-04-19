"""
Routers package for FastAPI endpoints.
"""

from .auth import router as auth_router

__all__ = ["auth_router"]
