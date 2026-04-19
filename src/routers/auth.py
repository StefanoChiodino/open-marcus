"""
Authentication router for FastAPI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse, MessageResponse
from ..services.auth import AuthService
from ..services.database import get_database_service


router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


def get_db() -> Session:
    """Dependency to get database session."""
    db_service = get_database_service()
    return db_service.get_session()


def get_auth_service() -> AuthService:
    """Dependency to get auth service."""
    return AuthService()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """
    Register a new user.
    
    Creates a new user account with hashed password.
    """
    user = auth_service.create_user(db, data.username, data.password)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Login with username and password.
    
    Returns JWT access token on success.
    """
    token = auth_service.authenticate_user(db, data.username, data.password)
    
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return TokenResponse(
        access_token=token.access_token,
        token_type=token.token_type
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    """
    Get current authenticated user.
    
    Requires valid JWT token.
    """
    from ..services.jwt import jwt_service
    
    token = credentials.credentials
    user_id = jwt_service.get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = auth_service.get_user_by_id(db, user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )


@router.post("/verify", response_model=MessageResponse)
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> MessageResponse:
    """
    Verify if a token is valid.
    
    Returns success message if token is valid.
    """
    from ..services.jwt import jwt_service
    
    token = credentials.credentials
    user_id = jwt_service.get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return MessageResponse(message="Token is valid")
