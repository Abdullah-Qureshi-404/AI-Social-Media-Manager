import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.menu import MenuStatusEnum, RecommendationStatusEnum


class MenuItemBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = Field(None, max_length=100)
    is_active: bool = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class MenuItemResponse(MenuItemBase):
    id: uuid.UUID
    menu_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MenuResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    version_number: int
    status: MenuStatusEnum
    source_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[MenuItemResponse] = []

    class Config:
        from_attributes = True


class MenuConfirmRequest(BaseModel):
    items: List[MenuItemCreate]


class PostRecommendationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    menu_item_id: uuid.UUID
    reason_context: str
    suggested_angle: Optional[str]
    status: RecommendationStatusEnum
    created_at: datetime
    updated_at: datetime
    menu_item: Optional[MenuItemResponse] = None

    class Config:
        from_attributes = True


class IngestMenuUrlRequest(BaseModel):
    url: str
