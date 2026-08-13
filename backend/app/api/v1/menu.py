import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, status, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user, get_db
from app.core.logging import logger
from app.models.user import User
from app.models.menu import Menu, MenuItem, PostRecommendation, MenuStatusEnum, RecommendationStatusEnum
from app.schemas.menu import MenuResponse, MenuConfirmRequest, PostRecommendationResponse, IngestMenuUrlRequest, MenuItemUpdate, MenuItemResponse
from app.services.menu_parser_ai import menu_parser_ai_service

router = APIRouter(prefix="/menu", tags=["Menu Intelligence"])


ALLOWED_MENU_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_MENU_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _verify_image_magic_bytes(header_bytes: bytes) -> bool:
    """Verify first 12 bytes match valid JPEG, PNG, or WEBP magic signatures."""
    if len(header_bytes) < 12:
        return False
    if header_bytes.startswith(b"\xff\xd8\xff"):
        return True  # JPEG
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return True  # PNG
    if header_bytes[:4] == b"RIFF" and header_bytes[8:12] == b"WEBP":
        return True  # WEBP
    return False


@router.post("/ingest/image", response_model=MenuResponse)
async def ingest_menu_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a menu image to parse into a DRAFT menu with streaming magic byte & size validation."""
    # 1. Fast-fail MIME type check from header
    if file.content_type not in ALLOWED_MENU_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format {file.content_type}. Allowed: JPEG, PNG, WEBP.",
        )

    # 2. Read first 12 bytes to verify magic bytes before reading full payload into memory
    header_bytes = await file.read(12)
    if not _verify_image_magic_bytes(header_bytes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image file content.",
        )

    # 3. Read remaining content & combine
    remaining_bytes = await file.read()
    content = header_bytes + remaining_bytes

    # 4. Enforce file size limit (10MB max)
    if len(content) > MAX_MENU_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 10 MB.",
        )

    parsed_items = await menu_parser_ai_service.parse_menu_from_bytes(content)

    return await _create_draft_menu(db, current_user.id, parsed_items)


@router.post("/ingest/url", response_model=MenuResponse)
async def ingest_menu_url(
    payload: IngestMenuUrlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Parse a menu from a URL into a DRAFT menu."""
    parsed_items = await menu_parser_ai_service.parse_menu_from_url(payload.url)
    return await _create_draft_menu(db, current_user.id, parsed_items, source_url=payload.url)


async def _create_draft_menu(db: AsyncSession, user_id: uuid.UUID, parsed_items: List[dict], source_url: str = None) -> Menu:
    # Get current version number
    stmt = select(Menu).where(Menu.user_id == user_id).order_by(desc(Menu.version_number)).limit(1)
    latest_menu = (await db.execute(stmt)).scalar_one_or_none()
    next_version = (latest_menu.version_number + 1) if latest_menu else 1

    draft_menu = Menu(
        user_id=user_id,
        version_number=next_version,
        status=MenuStatusEnum.DRAFT,
        source_url=source_url,
    )
    db.add(draft_menu)
    await db.flush()

    for item_data in parsed_items:
        item = MenuItem(
            menu_id=draft_menu.id,
            user_id=user_id,
            name=item_data.get("name", "Unknown Item"),
            description=item_data.get("description"),
            price=item_data.get("price"),
            category=item_data.get("category"),
            is_active=True,
        )
        db.add(item)
    
    await db.commit()
    await db.refresh(draft_menu, ["items"])
    return draft_menu


@router.post("/{menu_id}/confirm", response_model=MenuResponse)
async def confirm_menu(
    menu_id: uuid.UUID,
    payload: MenuConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm a DRAFT menu, making it ACTIVE.
    Archives the previously ACTIVE menu.
    Allows passing the corrected list of items.
    """
    # Get the draft menu
    stmt = select(Menu).options(selectinload(Menu.items)).where(Menu.id == menu_id, Menu.user_id == current_user.id)
    draft_menu = (await db.execute(stmt)).scalar_one_or_none()

    if not draft_menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if draft_menu.status != MenuStatusEnum.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT menus can be confirmed")

    # Archive currently active menus
    stmt = select(Menu).where(Menu.user_id == current_user.id, Menu.status == MenuStatusEnum.ACTIVE)
    active_menus = (await db.execute(stmt)).scalars().all()
    for active_menu in active_menus:
        active_menu.status = MenuStatusEnum.ARCHIVED

    # Update draft menu items with the confirmed payload
    # Delete old draft items
    for item in draft_menu.items:
        await db.delete(item)
    
    await db.flush()

    # Add confirmed items
    new_items = []
    for item_data in payload.items:
        item = MenuItem(
            menu_id=draft_menu.id,
            user_id=current_user.id,
            name=item_data.name,
            description=item_data.description,
            price=item_data.price,
            category=item_data.category,
            is_active=item_data.is_active,
        )
        db.add(item)
        new_items.append(item)

    draft_menu.status = MenuStatusEnum.ACTIVE
    
    await db.commit()
    
    # Reload with items
    stmt = select(Menu).options(selectinload(Menu.items)).where(Menu.id == menu_id)
    active_menu = (await db.execute(stmt)).scalar_one()

    # Trigger Strategy Engine asynchronously in background
    from app.tasks.strategy_tasks import generate_strategy_task, _async_generate_strategy
    from app.api.v1.posts import safe_dispatch_task
    await safe_dispatch_task(generate_strategy_task, _async_generate_strategy, str(current_user.id))

    return active_menu


@router.post("/strategy/generate")
async def trigger_strategy_generation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger strategy recommendation generation for the active menu."""
    stmt = select(Menu).where(Menu.user_id == current_user.id, Menu.status == MenuStatusEnum.ACTIVE)
    active_menu = (await db.execute(stmt)).scalar_one_or_none()
    if not active_menu:
        raise HTTPException(status_code=400, detail="No active menu found. Please upload and activate a menu first.")

    from app.tasks.strategy_tasks import generate_strategy_task, _async_generate_strategy
    from app.api.v1.posts import safe_dispatch_task
    await safe_dispatch_task(generate_strategy_task, _async_generate_strategy, str(current_user.id))
    return {"status": "QUEUED", "message": "Strategy recommendation generation dispatched"}



@router.get("/active", response_model=MenuResponse)
async def get_active_menu(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the currently ACTIVE menu and its items."""
    stmt = select(Menu).options(selectinload(Menu.items)).where(
        Menu.user_id == current_user.id, 
        Menu.status == MenuStatusEnum.ACTIVE
    ).order_by(desc(Menu.version_number)).limit(1)
    
    active_menu = (await db.execute(stmt)).scalar_one_or_none()
    
    if not active_menu:
        raise HTTPException(status_code=404, detail="No active menu found")
        
    return active_menu


@router.get("/recommendations", response_model=List[PostRecommendationResponse])
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get active post recommendations for the dashboard."""
    stmt = select(PostRecommendation).options(selectinload(PostRecommendation.menu_item)).where(
        PostRecommendation.user_id == current_user.id,
        PostRecommendation.status == RecommendationStatusEnum.ACTIVE
    ).order_by(desc(PostRecommendation.created_at))
    
    recommendations = (await db.execute(stmt)).scalars().all()
    return recommendations


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: uuid.UUID,
    payload: MenuItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a specific menu item (e.g. toggle active status or edit fields)."""
    stmt = select(MenuItem).where(MenuItem.id == item_id)
    item = (await db.execute(stmt)).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    if item.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to menu item")

    if payload.name is not None:
        item.name = payload.name
    if payload.description is not None:
        item.description = payload.description
    if payload.price is not None:
        item.price = payload.price
    if payload.category is not None:
        item.category = payload.category
    if payload.is_active is not None:
        item.is_active = payload.is_active

    await db.commit()
    await db.refresh(item)
    return item
