import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    business_name: Optional[str] = None
    brand_voice: str = "friendly"


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: uuid.UUID
    logo_url: Optional[str] = None
    plan: str = "Pro SaaS"
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    instagram_business_name: Optional[str] = None
    instagram_profile_picture: Optional[str] = None
    instagram_followers_count: int = 0
    instagram_following_count: int = 0
    instagram_posts_count: int = 0
    instagram_category: Optional[str] = None
    instagram_connected_at: Optional[datetime] = None
    instagram_last_sync: Optional[datetime] = None
    token_expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TenantQuotaSchema(BaseModel):
    free_edits_remaining: int
    max_edits_allowed: int
    image_generations: int
    posts_remaining: int
    posts_this_month: int
    storage_usage: str


class TenantInstagramSchema(BaseModel):
    connected: bool
    business_name: Optional[str] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    followers: int = 0
    following: int = 0
    posts: int = 0
    category: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    token_expiry: Optional[datetime] = None


class TenantProfileResponse(BaseModel):
    id: uuid.UUID
    restaurant_name: str
    owner_name: str
    email: str
    logo_url: Optional[str] = None
    brand_voice: str
    plan: str
    quota: TenantQuotaSchema
    instagram: TenantInstagramSchema


class UpdateTenantProfileRequest(BaseModel):
    restaurant_name: Optional[str] = None
    owner_name: Optional[str] = None
    brand_voice: Optional[str] = None
    logo_url: Optional[str] = None
