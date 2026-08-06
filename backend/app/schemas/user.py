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
    instagram_user_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
