"""
FastAPI application for OpenMarcus backend API.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import auth_router, session_router
from .routers.profile import router as profile_router
from .routers.settings import router as settings_router
from .routers.models import router as models_router
from .routers.stt import router as stt_router
from .services.database import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup/shutdown."""
    # Startup
    init_database()
    yield
    # Shutdown - nothing needed


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="OpenMarcus API",
        description="Backend API for OpenMarcus meditation app",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # CORS middleware for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, this should be more restrictive
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(auth_router)
    app.include_router(profile_router)
    app.include_router(settings_router)
    app.include_router(models_router)
    app.include_router(session_router)
    app.include_router(stt_router)
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy"}
    
    return app


app = create_app()
