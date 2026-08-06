import uuid
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.post import PostStatusEnum


class PostVersionResponse(BaseModel):
    id: uuid.UUID
    version_number: int
    image_url: str
    prompt_used: Optional[str] = None
    preset_style: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: PostStatusEnum
    original_image_url: str
    temp_image_url: Optional[str] = None
    current_edited_image_url: Optional[str] = None
    permanent_image_url: Optional[str] = None
    caption: Optional[str] = None
    edit_count: int
    max_edits_allowed: int
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    error_message: Optional[str] = None
    instagram_media_id: Optional[str] = None
    image_analysis_json: Optional[dict] = None
    overlay_design_json: Optional[dict] = None
    fabric_canvas_json: Optional[dict] = None
    versions: List[PostVersionResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIEditRequest(BaseModel):
    preset_name: str = "golden_hour"
    custom_instruction: Optional[str] = None


class GenerateCaptionsRequest(BaseModel):
    user_instruction: Optional[str] = None


class OverlayTextRequest(BaseModel):
    caption_text: Optional[str] = None
    watermark_enabled: bool = True
    force: bool = False


class SaveCanvasRequest(BaseModel):
    canvas_json: dict


class SchedulePostRequest(BaseModel):
    scheduled_at: datetime
    caption: Optional[str] = None
    hashtags: List[str] = []


class JobStatusResponse(BaseModel):
    job_id: str
    post_id: str
    status: str
    progress_percent: int
    message: str

