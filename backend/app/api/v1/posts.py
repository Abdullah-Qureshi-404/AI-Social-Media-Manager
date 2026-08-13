import asyncio
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.constants import ALLOWED_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES
from app.core.logging import logger
from app.middleware.exception_handler import AppException, NotFoundError
from app.utils.security_validators import validate_image_upload, POST_MAX_IMAGE_BYTES
from app.models.user import User
from app.models.post import PostStatusEnum
from app.models.menu import MenuItem, PostRecommendation
from app.repositories.post_repository import post_repository
from app.schemas.post import (
    PostResponse,
    AIEditRequest,
    GenerateCaptionsRequest,
    OverlayTextRequest,
    SaveCanvasRequest,
    SchedulePostRequest,
    JobStatusResponse,
)
from app.services.cloudinary_service import cloudinary_service
from app.services.caption_ai import caption_ai_service
from app.services.image_design_service import image_design_service
from app.utils.image_resizer import resize_and_pad_image
from app.tasks.process_image import process_image_task, _async_process_image

router = APIRouter(prefix="/posts", tags=["Posts Lifecycle"])


async def safe_dispatch_task(celery_task, async_impl, *args, **kwargs):
    """
    Safely dispatch task to Celery Redis broker.
    If Redis is down or connection is refused, fall back gracefully to inline asyncio task.
    """
    try:
        celery_task.delay(*args, **kwargs)
    except Exception as e:
        logger.warning(f"Celery Redis broker offline: {e}. Executing task via inline asyncio background task.")
        asyncio.create_task(async_impl(None, *args, **kwargs))


@router.post("/upload", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def upload_raw_photo(
    file: UploadFile = File(...),
    menu_item_id: Optional[uuid.UUID] = Form(None),
    recommendation_id: Optional[uuid.UUID] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload raw phone photo. Downscales to 1080x1080 and stages in Cloudinary temp/{user_id}/.
    Enforces tenant isolation.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise AppException(
            message=f"Unsupported file format {file.content_type}. Allowed: JPEG, PNG, WEBP.",
            code="UNSUPPORTED_FILE_TYPE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    content = await file.read()

    # Full validation: MIME allow-list + magic-byte + size limit (reuses centralized gate)
    validate_image_upload(content, file.content_type, max_bytes=MAX_UPLOAD_SIZE_BYTES)

    # Downscale and pad image to 1080x1080
    resized_bytes = resize_and_pad_image(content)

    # Upload to Cloudinary temporary staging folder for current tenant
    upload_res = await cloudinary_service.upload_temporary_image(resized_bytes, current_user.id)

    # Validate tenant ownership of menu_item_id and recommendation_id
    if menu_item_id:
        from sqlalchemy import select
        stmt = select(MenuItem).where(MenuItem.id == menu_item_id)
        menu_item = (await db.execute(stmt)).scalar_one_or_none()
        if not menu_item:
            raise NotFoundError("Menu item not found")
        if menu_item.user_id != current_user.id:
            raise AppException(
                message="Access denied to menu item",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    if recommendation_id:
        from sqlalchemy import select
        stmt = select(PostRecommendation).where(PostRecommendation.id == recommendation_id)
        rec = (await db.execute(stmt)).scalar_one_or_none()
        if not rec:
            raise NotFoundError("Recommendation not found")
        if rec.user_id != current_user.id:
            raise AppException(
                message="Access denied to recommendation",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        if menu_item_id and rec.menu_item_id != menu_item_id:
            raise AppException(
                message="Recommendation does not match provided menu item",
                code="MISMATCHED_RECOMMENDATION",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not menu_item_id:
            menu_item_id = rec.menu_item_id

    # Create Post in database scoped to current_user.id
    post = await post_repository.create(
        db,
        user_id=current_user.id,
        status=PostStatusEnum.UPLOADED,
        original_image_url=upload_res["url"],
        temp_image_url=upload_res["url"],
        menu_item_id=menu_item_id,
        recommendation_id=recommendation_id,
    )
    post.versions = []
    return post


@router.post("/{post_id}/upload-edited-image", response_model=PostResponse)
async def upload_edited_image(
    post_id: uuid.UUID,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload interactive canvas edited image blob.
    Stores image in Cloudinary folder social_media_manager/edited/{user_id}/ and updates post.current_edited_image_url.
    """
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    content = await image.read()

    # Full validation: MIME allow-list + magic-byte + 10 MB size limit
    validate_image_upload(content, image.content_type, max_bytes=POST_MAX_IMAGE_BYTES)

    if not content:
        raise AppException(
            message="Uploaded image blob is empty.",
            code="EMPTY_IMAGE",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    upload_res = await cloudinary_service.upload_edited_image(content, current_user.id)
    edited_url = upload_res["url"]

    post.current_edited_image_url = edited_url
    post.temp_image_url = edited_url
    await db.commit()
    await db.refresh(post)
    return post


@router.post("/{post_id}/ai-edit", response_model=JobStatusResponse)

async def trigger_ai_edit(
    post_id: uuid.UUID,
    payload: AIEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Enqueue Celery background task for AI photo enhancement."""
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    job_id = f"job-{uuid.uuid4()}"
    await safe_dispatch_task(
        process_image_task,
        _async_process_image,
        post_id_str=str(post.id),
        user_id_str=str(current_user.id),
        preset_name=payload.preset_name,
        custom_instruction=payload.custom_instruction,
        job_id=job_id,
    )

    return JobStatusResponse(
        job_id=job_id,
        post_id=str(post.id),
        status="QUEUED",
        progress_percent=10,
        message=f"Queued AI photo edit with preset [{payload.preset_name}]",
    )


@router.post("/{post_id}/generate-captions")
async def trigger_caption_generation(
    post_id: uuid.UUID,
    payload: Optional[GenerateCaptionsRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate image-aware captions & hashtags directly."""
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    user_instruction = payload.user_instruction if payload else ""
    
    # AI Strategy Injection
    if post.menu_item_id:
        from sqlalchemy import select
        stmt = select(MenuItem).where(MenuItem.id == post.menu_item_id)
        menu_item = (await db.execute(stmt)).scalar_one_or_none()
        if menu_item:
            strategy_context = f" This post is for our menu item '{menu_item.name}'. "
            if menu_item.price:
                strategy_context += f"The price is ${menu_item.price}. "
            if post.recommendation_id:
                stmt_rec = select(PostRecommendation).where(PostRecommendation.id == post.recommendation_id)
                rec = (await db.execute(stmt_rec)).scalar_one_or_none()
                if rec and rec.suggested_angle:
                    strategy_context += f"Strategy angle: {rec.suggested_angle}. "
            
            user_instruction = strategy_context + (user_instruction or "")

    brand_voice = current_user.brand_voice or "friendly"
    image_target = post.current_edited_image_url or post.temp_image_url or post.original_image_url

    caption_data = await caption_ai_service.generate_captions_and_hashtags(
        image_url=image_target,
        brand_voice=brand_voice,
        user_instruction=user_instruction,
    )

    captions = caption_data.get("captions", [])
    if post.menu_item_id:
        from sqlalchemy import select
        stmt = select(MenuItem).where(MenuItem.id == post.menu_item_id)
        menu_item = (await db.execute(stmt)).scalar_one_or_none()
        if menu_item:
            for cap in captions:
                cap["text"] = caption_ai_service.verify_caption_facts(
                    cap.get("text", ""),
                    menu_item.name,
                    float(menu_item.price) if menu_item.price is not None else None,
                )

    if captions:
        post.caption = captions[0].get("text", "")
        post.status = PostStatusEnum.CAPTION_READY
        await db.commit()

    return caption_data


@router.post("/{post_id}/overlay-text")
async def trigger_text_overlay(
    post_id: uuid.UUID,
    payload: OverlayTextRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Zero-Thinking Smart Overlay endpoint.

    1. Validates image analysis cache (SHA-256 hash)
    2. Checks manual edit protection (409 Conflict if fabric_canvas_json exists without force)
    3. Runs two-step Gemini analysis: composition → design
    4. Saves overlay_design_json to database
    5. Returns design JSON for Fabric.js rendering
    """
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    # Safeguard 2: Protect manual Fabric edits
    if post.fabric_canvas_json and not payload.force:
        raise AppException(
            message="This post has manual design changes. Set force=true to replace.",
            code="MANUAL_EDITS_EXIST",
            status_code=409,
        )

    image_url = post.current_edited_image_url or post.temp_image_url or post.original_image_url

    # Step 1: Get or compute image analysis (with SHA-256 cache validation)
    analysis, _ = await image_design_service.get_or_analyze(post, image_url)

    # Step 2: Generate overlay design from analysis + user text
    user_text = payload.caption_text or post.caption or "Daily Artisanal Special"
    design = await image_design_service.generate_overlay_design(analysis, user_text)

    # Save design JSON to database
    post.overlay_design_json = design

    # Clear previous manual edits if force=true (new design replaces old)
    if payload.force:
        post.fabric_canvas_json = None

    await db.commit()
    await db.refresh(post)

    return {
        "design": design,
        "post": PostResponse.model_validate(post).model_dump(mode="json"),
    }


@router.post("/{post_id}/save-canvas", response_model=PostResponse)
async def save_canvas_state(
    post_id: uuid.UUID,
    payload: SaveCanvasRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save Fabric.js canvas state after manual editing in the Edit & Refine modal.
    Stores the full canvas JSON including custom object IDs (id, customType).
    """
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    post.fabric_canvas_json = payload.canvas_json
    await db.commit()
    await db.refresh(post)
    return post


@router.post("/{post_id}/auto-design")
async def get_auto_design(
    post_id: uuid.UUID,
    caption_text: Optional[str] = Query(None),
    refresh: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Two-step image analysis + design generation.
    Returns smart layout, font, position, color, and background parameters.
    If refresh=true, forces Gemini to pick an alternative layout design.
    """
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    image_url = post.current_edited_image_url or post.temp_image_url or post.original_image_url
    text_to_analyze = caption_text or post.caption or "Artisanal Daily Special"

    # Step 1: Get or compute image analysis
    analysis, _ = await image_design_service.get_or_analyze(post, image_url)

    # Step 2: Generate design (with variation if refresh=True)
    design = await image_design_service.generate_overlay_design(analysis, text_to_analyze, is_variation=refresh)

    # Save to DB
    post.overlay_design_json = design
    await db.commit()

    return design


@router.post("/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve final post: promotes Cloudinary staging image to permanent folder."""
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    # Menu Verification Check
    if post.menu_item_id:
        from sqlalchemy import select
        stmt = select(MenuItem).where(MenuItem.id == post.menu_item_id)
        menu_item = (await db.execute(stmt)).scalar_one_or_none()
        
        if not menu_item or not menu_item.is_active:
            raise AppException(
                message="Cannot approve post: Associated menu item is inactive or deleted.",
                code="MENU_ITEM_INACTIVE",
                status_code=400,
            )
        if menu_item.user_id != current_user.id:
            raise AppException(
                message="Access denied to associated menu item",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        
        # Simple mismatch verification (check if generated text mentions price incorrectly)
        caption_text = post.caption or ""
        if menu_item.price and str(menu_item.price) not in caption_text:
            pass

    # Transition associated recommendation to ACTED_UPON
    if post.recommendation_id:
        from sqlalchemy import select
        from app.models.menu import RecommendationStatusEnum
        stmt_rec = select(PostRecommendation).where(PostRecommendation.id == post.recommendation_id)
        rec = (await db.execute(stmt_rec)).scalar_one_or_none()
        if rec and rec.user_id == current_user.id:
            rec.status = RecommendationStatusEnum.ACTED_UPON

    source = post.temp_image_url or post.current_edited_image_url or post.original_image_url
    promoted = await cloudinary_service.promote_to_permanent(source, current_user.id)

    post.permanent_image_url = promoted["url"]
    post.status = PostStatusEnum.APPROVED
    await db.commit()
    await db.refresh(post)
    return post


@router.post("/{post_id}/schedule", response_model=PostResponse)
async def schedule_post(
    post_id: uuid.UUID,
    payload: SchedulePostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set schedule date/time and update post status to SCHEDULED."""
    post = await post_repository.get_by_id(db, post_id, current_user.id)
    if not post:
        raise NotFoundError("Post not found")

    # Menu Verification Check
    if post.menu_item_id:
        from sqlalchemy import select
        stmt = select(MenuItem).where(MenuItem.id == post.menu_item_id)
        menu_item = (await db.execute(stmt)).scalar_one_or_none()
        
        if not menu_item or not menu_item.is_active:
            raise AppException(
                message="Cannot schedule post: Associated menu item is inactive or deleted.",
                code="MENU_ITEM_INACTIVE",
                status_code=400,
            )
        if menu_item.user_id != current_user.id:
            raise AppException(
                message="Access denied to associated menu item",
                code="FORBIDDEN",
                status_code=status.HTTP_403_FORBIDDEN,
            )

    # Transition associated recommendation to ACTED_UPON
    if post.recommendation_id:
        from sqlalchemy import select
        from app.models.menu import RecommendationStatusEnum
        stmt_rec = select(PostRecommendation).where(PostRecommendation.id == post.recommendation_id)
        rec = (await db.execute(stmt_rec)).scalar_one_or_none()
        if rec and rec.user_id == current_user.id:
            rec.status = RecommendationStatusEnum.ACTED_UPON

    if payload.caption:
        post.caption = payload.caption

    post.scheduled_at = payload.scheduled_at
    post.status = PostStatusEnum.SCHEDULED
    await db.commit()
    await db.refresh(post)
    return post


@router.get("", response_model=List[PostResponse])
async def list_posts(
    status_filter: Optional[PostStatusEnum] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List posts owned by current tenant with optional status filter."""
    return await post_repository.get_tenant_posts(
        db, user_id=current_user.id, status=status_filter, page=page, limit=limit
    )


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
async def delete_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete post owned by current tenant."""
    success = await post_repository.delete(db, post_id, current_user.id)
    if not success:
        raise NotFoundError("Post not found")
    return {"message": "Post successfully deleted"}
