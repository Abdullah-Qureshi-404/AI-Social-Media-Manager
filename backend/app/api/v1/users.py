from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_current_user, get_db
from app.core.token_encryption import decrypt_token, encrypt_token
from app.models.user import User
from app.models.post import Post
from app.schemas.user import (
    UserResponse,
    TenantProfileResponse,
    TenantQuotaSchema,
    TenantInstagramSchema,
    UpdateTenantProfileRequest,
)

router = APIRouter(prefix="/users", tags=["Users & Settings"])
tenant_router = APIRouter(prefix="/tenant", tags=["Tenant Profile"])


async def build_tenant_profile_response(user: User, db: AsyncSession) -> TenantProfileResponse:
    """Helper to build tenant profile response dynamically from DB user and posts quota."""
    # Count posts created this month by current tenant
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    result = await db.execute(
        select(func.count(Post.id)).where(
            Post.user_id == user.id,
            Post.created_at >= month_start,
        )
    )
    posts_this_month = result.scalar() or 0

    total_posts_result = await db.execute(
        select(func.count(Post.id)).where(Post.user_id == user.id)
    )
    total_posts = total_posts_result.scalar() or 0

    # Quotas
    quota = TenantQuotaSchema(
        free_edits_remaining=3,
        max_edits_allowed=3,
        image_generations=25,
        posts_remaining=max(0, 30 - total_posts),
        posts_this_month=posts_this_month,
        storage_usage="1.2 GB / 5.0 GB",
    )

    # Instagram status
    is_connected = bool(user.instagram_token or user.instagram_user_id)
    instagram = TenantInstagramSchema(
        connected=is_connected,
        business_name=user.instagram_business_name or user.business_name or "My Restaurant",
        username=user.instagram_username or (user.business_name.lower().replace(" ", "_") if user.business_name else "my_restaurant"),
        profile_picture=user.instagram_profile_picture or user.logo_url or "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=200&q=80",
        followers=user.instagram_followers_count if is_connected else 0,
        following=user.instagram_following_count if is_connected else 0,
        posts=user.instagram_posts_count if is_connected else 0,
        category=user.instagram_category or "Cafe & Restaurant",
        connected_at=user.instagram_connected_at,
        last_sync=user.instagram_last_sync,
        token_expiry=user.token_expires_at,
    )

    return TenantProfileResponse(
        id=user.id,
        restaurant_name=user.business_name or "My Restaurant",
        owner_name=user.full_name or "Owner",
        email=user.email,
        logo_url=user.logo_url,
        brand_voice=user.brand_voice or "friendly",
        plan=user.plan or "Pro SaaS",
        quota=quota,
        instagram=instagram,
    )


# ──────────────────────────────────────────────
# Legacy / Users Endpoints
# ──────────────────────────────────────────────

@router.get("/me", response_model=TenantProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch current tenant user profile and connection status."""
    return await build_tenant_profile_response(current_user, db)


# ──────────────────────────────────────────────
# Dedicated Tenant Endpoints
# ──────────────────────────────────────────────

@tenant_router.get("/profile", response_model=TenantProfileResponse)
async def get_tenant_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get complete multi-tenant profile, quotas, and Instagram connection status."""
    return await build_tenant_profile_response(current_user, db)


@tenant_router.put("/profile", response_model=TenantProfileResponse)
async def update_tenant_profile(
    payload: UpdateTenantProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant restaurant name, owner name, brand voice, and logo."""
    if payload.restaurant_name is not None:
        current_user.business_name = payload.restaurant_name.strip()
    if payload.owner_name is not None:
        current_user.full_name = payload.owner_name.strip()
    if payload.brand_voice is not None:
        current_user.brand_voice = payload.brand_voice.strip().lower()
    if payload.logo_url is not None:
        current_user.logo_url = payload.logo_url.strip()

    await db.commit()
    await db.refresh(current_user)
    return await build_tenant_profile_response(current_user, db)


@tenant_router.post("/instagram/connect", response_model=TenantProfileResponse)
async def connect_instagram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiate Meta Instagram OAuth.  This stub is kept for backward compatibility
    with the frontend store which calls POST /tenant/instagram/connect.
    The real OAuth start is GET /tenant/instagram/connect (browser redirect).
    This POST variant returns instructions for the frontend to redirect the browser.
    """
    from app.core.config import settings
    if not settings.META_APP_ID:
        from app.middleware.exception_handler import AppException
        raise AppException(
            message="Instagram connection is not yet configured on this server.",
            code="META_NOT_CONFIGURED",
            status_code=503,
        )
    # Tell the frontend where to navigate for the real OAuth flow
    return JSONResponse(
        status_code=200,
        content={
            "oauth_redirect": True,
            "connect_url": "/api/v1/tenant/instagram/connect",
            "message": "Navigate to connect_url to start Instagram OAuth.",
        },
    )


@tenant_router.post("/instagram/disconnect", response_model=TenantProfileResponse)
async def disconnect_instagram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect tenant Meta Instagram Business Account — delegates to OAuth router."""
    current_user.instagram_user_id = None
    current_user.instagram_token = None
    current_user.token_expires_at = None
    current_user.instagram_connected_at = None
    current_user.instagram_last_sync = None
    current_user.instagram_username = None
    current_user.instagram_business_name = None
    current_user.instagram_profile_picture = None
    current_user.instagram_followers_count = 0
    current_user.instagram_following_count = 0
    current_user.instagram_posts_count = 0
    current_user.instagram_category = None
    await db.commit()
    await db.refresh(current_user)
    return await build_tenant_profile_response(current_user, db)


@tenant_router.post("/instagram/refresh", response_model=TenantProfileResponse)
async def refresh_instagram_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Refresh Instagram token and metrics using the stored real token."""
    from app.services.instagram_service import instagram_service
    from app.middleware.exception_handler import AppException
    from datetime import timezone

    if not current_user.instagram_token or not current_user.instagram_user_id:
        raise AppException(
            message="No Instagram account connected. Please connect first.",
            code="INSTAGRAM_NOT_CONNECTED",
            status_code=400,
        )

    try:
        plaintext_token = decrypt_token(current_user.instagram_token)
    except ValueError:
        raise AppException(
            message="Instagram token is corrupted. Please reconnect.",
            code="INSTAGRAM_TOKEN_CORRUPTED",
            status_code=400,
        )

    try:
        ig_info = await instagram_service.get_ig_user_info(plaintext_token)
        current_user.instagram_followers_count = ig_info.get("followers_count", current_user.instagram_followers_count)
        current_user.instagram_following_count = ig_info.get("follows_count", current_user.instagram_following_count)
        current_user.instagram_posts_count = ig_info.get("media_count", current_user.instagram_posts_count)
        current_user.instagram_last_sync = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(current_user)
    except AppException:
        pass  # Return current profile even if refresh fails

    return await build_tenant_profile_response(current_user, db)


def user_id_short(uid) -> str:
    return str(uid).replace("-", "")[:8]
