"""
Profile router for FastAPI.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime

from ..schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from ..services.database import get_database_service
from ..models.profile import Profile
from ..services.jwt import jwt_service


router = APIRouter(prefix="/api/profile", tags=["profile"])
security = HTTPBearer()


def get_db() -> Session:
    """Dependency to get database session."""
    db_service = get_database_service()
    return db_service.get_session()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract and validate user ID from JWT token."""
    token = credentials.credentials
    user_id = jwt_service.get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_id


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: ProfileCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ProfileResponse:
    """
    Create a new profile for the current user.
    
    Each user can only have one profile.
    """
    # Check if profile already exists for this user
    existing = db.query(Profile).filter(Profile.user_id == user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists for this user"
        )
    
    # Create new profile
    profile = Profile(
        user_id=user_id,
        name=data.name,
        goals=data.goals,
        experience_level=data.experience_level,
        created_at=datetime.utcnow()
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        goals=profile.goals,
        experience_level=profile.experience_level,
        created_at=profile.created_at.isoformat() if profile.created_at else "",
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ProfileResponse:
    """
    Get the current user's profile.
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        goals=profile.goals,
        experience_level=profile.experience_level,
        created_at=profile.created_at.isoformat() if profile.created_at else "",
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )


@router.put("", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
) -> ProfileResponse:
    """
    Update the current user's profile.
    """
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    # Update fields
    profile.name = data.name
    profile.goals = data.goals
    profile.experience_level = data.experience_level
    profile.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    
    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        name=profile.name,
        goals=profile.goals,
        experience_level=profile.experience_level,
        created_at=profile.created_at.isoformat() if profile.created_at else "",
        updated_at=profile.updated_at.isoformat() if profile.updated_at else None
    )
