import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.middleware.exception_handler import AppException, UnauthorizedError
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new tenant user account."""
    existing_user = await user_repository.get_by_email(db, user_in.email)
    if existing_user:
        raise AppException(
            message="An account with this email address already exists",
            code="USER_ALREADY_EXISTS",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    user_data = user_in.model_dump()
    user_data["password_hash"] = hash_password(user_data.pop("password"))
    user_data["email"] = user_in.email.lower().strip()

    new_user = await user_repository.create(db, **user_data)
    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user credentials and issue JWT access + refresh tokens."""
    user = await user_repository.get_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.password_hash):
        raise UnauthorizedError("Invalid email or password")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh_token for a fresh access_token."""
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid or expired refresh token")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError("Malformed user ID")

    user = await user_repository.get_by_id(db, user_id)
    if not user:
        raise UnauthorizedError("User account not found")

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: User = Depends(get_current_user)):
    """Acknowledge logout request."""
    return {"message": "Successfully logged out"}
