from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users & Settings"])


class UpdateSettingsRequest(BaseModel):
    brand_voice: Optional[str] = None
    business_name: Optional[str] = None
    instagram_user_id: Optional[str] = None
    instagram_token: Optional[str] = None


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Fetch current tenant user profile and connection status."""
    return current_user


@router.put("/settings", response_model=UserResponse)
async def update_user_settings(
    payload: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant brand voice and Meta Instagram Business Account credentials."""
    if payload.brand_voice:
        current_user.brand_voice = payload.brand_voice
    if payload.business_name:
        current_user.business_name = payload.business_name

    if payload.instagram_user_id and payload.instagram_token:
        current_user.instagram_user_id = payload.instagram_user_id
        current_user.instagram_token = payload.instagram_token
        current_user.token_expires_at = datetime.utcnow() + timedelta(days=60)

    await db.commit()
    await db.refresh(current_user)
    return current_user
