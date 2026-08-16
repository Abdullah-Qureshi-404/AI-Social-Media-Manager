"""
Real Meta/Instagram OAuth 2.0 endpoints for multi-tenant SaaS.

OAuth initiation is a two-step process to keep the JWT out of URLs:

  Step A (API call, JWT in Authorization header, never in URL):
    POST /tenant/instagram/initiate
    → validates JWT normally
    → returns a short-lived opaque init_token (NOT the JWT)

  Step B (browser navigation — no JWT in URL):
    GET /tenant/instagram/connect?init=<init_token>
    → validates init_token from Redis (single-use, 5-min TTL)
    → generates the OAuth state
    → redirects browser to Meta authorization dialog

This prevents the JWT from appearing in:
  - browser address bar and history
  - server access logs
  - Referer header sent to Meta's dialog
  - any CDN/proxy log between the SPA and backend

The OAuth state (separate from the init_token) is also stored in Redis:
  - cryptographically random (32 bytes / 64 hex chars)
  - bound to the authenticated tenant's user_id
  - single-use (deleted on first successful use)
  - short-lived (10 minutes TTL)

The META_APP_SECRET is used server-side only inside instagram_service and
is never included in any HTTP response, log line, or redirect URL.

Access tokens are encrypted at rest via app.core.token_encryption before
being written to the database.
"""
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional

import redis
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.core.config import settings
from app.core.logging import logger
from app.core.token_encryption import encrypt_token, decrypt_token
from app.middleware.exception_handler import AppException, UnauthorizedError
from app.models.user import User
from app.services.instagram_service import instagram_service

router = APIRouter(prefix="/tenant/instagram", tags=["Instagram OAuth"])

# ---------------------------------------------------------------------------
# Redis state store (reuses the existing REDIS_URL — no second client)
# ---------------------------------------------------------------------------
_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

_OAUTH_STATE_TTL_SECONDS = 600   # 10 minutes — time for user to complete Meta dialog
_STATE_KEY_PREFIX = "ig_oauth_state:"

# Init-token: opaque one-time token issued to the SPA before browser redirect.
# It replaces the JWT-in-URL anti-pattern.  Its only purpose is to prove that
# the browser navigating to /connect was just authorised by a valid JWT.
_INIT_TOKEN_TTL_SECONDS = 300    # 5 minutes — more than enough to click a button
_INIT_TOKEN_PREFIX = "ig_init_token:"


def _store_oauth_state(state: str, user_id: str) -> None:
    """Store state → user_id mapping in Redis with 10-min TTL."""
    try:
        _redis.setex(f"{_STATE_KEY_PREFIX}{state}", _OAUTH_STATE_TTL_SECONDS, user_id)
    except Exception as exc:
        logger.error(f"Redis oauth state write failed: {type(exc).__name__}")
        raise AppException(
            message="Could not initiate OAuth flow. Please try again.",
            code="OAUTH_STATE_STORE_FAILED",
            status_code=500,
        )


def _consume_oauth_state(state: str) -> Optional[str]:
    """
    Atomically retrieve and delete the state entry.
    Returns the bound user_id string, or None if expired/invalid/absent.
    """
    key = f"{_STATE_KEY_PREFIX}{state}"
    try:
        # GET then DELETE in a pipeline — single-use guarantee
        pipe = _redis.pipeline()
        pipe.get(key)
        pipe.delete(key)
        results = pipe.execute()
        return results[0]  # user_id or None
    except Exception as exc:
        logger.error(f"Redis oauth state consume failed: {type(exc).__name__}")
        return None  # Fail secure: treat as invalid state


def _store_init_token(init_token: str, user_id: str) -> None:
    """Store an opaque init_token → user_id mapping with 5-min TTL."""
    try:
        _redis.setex(f"{_INIT_TOKEN_PREFIX}{init_token}", _INIT_TOKEN_TTL_SECONDS, user_id)
    except Exception as exc:
        logger.error(f"Redis init_token write failed: {type(exc).__name__}")
        raise AppException(
            message="Could not start OAuth flow. Please try again.",
            code="OAUTH_INIT_STORE_FAILED",
            status_code=500,
        )


def _consume_init_token(init_token: str) -> Optional[str]:
    """
    Atomically retrieve and delete the init_token entry (single-use).
    Returns the bound user_id string, or None if expired/invalid/absent.
    Fails closed on Redis errors so an unknown error cannot be exploited.
    """
    key = f"{_INIT_TOKEN_PREFIX}{init_token}"
    try:
        pipe = _redis.pipeline()
        pipe.get(key)
        pipe.delete(key)
        results = pipe.execute()
        return results[0]  # user_id or None
    except Exception as exc:
        logger.error(f"Redis init_token consume failed: {type(exc).__name__}")
        return None  # Fail secure


# ---------------------------------------------------------------------------
# Helper: build the Meta/Instagram authorization URL
# ---------------------------------------------------------------------------
_REQUIRED_SCOPES = [
    "instagram_business_basic",
    "instagram_business_content_publish",
]


def _build_meta_auth_url(state: str) -> str:
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "response_type": "code",
        "scope": ",".join(_REQUIRED_SCOPES),
        "state": state,
        "force_reauth": "true",
        "enable_fb_login": "0",
    }
    return "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode(params)


# ---------------------------------------------------------------------------
# Helper: safe frontend redirect after callback
# ---------------------------------------------------------------------------
def _frontend_redirect(success: bool, message: str = "") -> RedirectResponse:
    """
    Redirect the browser back to the SPA after the OAuth callback completes.
    Outcome is communicated via query params (never via fragment — avoidance
    of token-in-URL anti-pattern).
    """
    base = settings.FRONTEND_URL.rstrip("/")
    if success:
        params = urllib.parse.urlencode({"oauth_success": "1"})
    else:
        safe_msg = message[:200] if message else "Connection failed"
        params = urllib.parse.urlencode({"oauth_error": safe_msg})
    return RedirectResponse(url=f"{base}/?{params}", status_code=302)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/initiate")
async def instagram_initiate(
    current_user: User = Depends(get_current_user),
):
    """
    Step A of OAuth initiation — authenticated via JWT in Authorization header.

    Generates a short-lived opaque init_token (not the JWT itself), stores it
    in Redis bound to the current tenant, and returns it to the SPA.

    The SPA then navigates the browser to GET /connect?init=<token>.
    This keeps the JWT out of all URLs, browser history, logs, and Referer headers.
    """
    if not settings.META_APP_ID:
        raise AppException(
            message="Instagram connection is not configured on this server. "
                    "Please contact your administrator.",
            code="META_NOT_CONFIGURED",
            status_code=503,
        )

    # 32 bytes of randomness — opaque, single-use, 5-minute lifetime
    init_token = secrets.token_hex(32)
    _store_init_token(init_token, str(current_user.id))

    logger.info(f"Tenant {current_user.id} obtained OAuth init_token")
    return {"init_token": init_token}


@router.get("/connect")
async def instagram_connect(
    init: Optional[str] = Query(None, description="Opaque single-use init token from POST /initiate"),
    db: AsyncSession = Depends(get_db),
):
    """
    Step B of OAuth initiation — browser navigates here with ?init=<opaque_token>.

    SECURITY:
    - No JWT appears in this URL.  The JWT was used in the prior POST /initiate call.
    - The init_token is opaque, single-use, and expires in 5 minutes.
    - Even if the URL is logged or leaked, the init_token cannot be used twice
      and does not grant any API access — only the ability to start an OAuth
      flow that must complete through Meta's dialog on the same device.
    - The tenant user_id is derived from the Redis init_token entry,
      never from a browser-supplied parameter.
    """
    if not init:
        return _frontend_redirect(
            success=False,
            message="Missing OAuth initiation token. Please click 'Connect Instagram' again.",
        )

    # Validate and consume the init_token (single-use, fails closed)
    user_id_str = _consume_init_token(init)
    if not user_id_str:
        return _frontend_redirect(
            success=False,
            message="OAuth initiation token expired or invalid. Please click 'Connect Instagram' again.",
        )

    # Load the tenant from DB using the server-side bound user_id
    from app.repositories.user_repository import user_repository
    import uuid
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.error("OAuth init_token contained invalid UUID — possible tampering")
        return _frontend_redirect(success=False, message="Invalid session. Please try again.")

    user = await user_repository.get_by_id(db, user_id)
    if not user:
        logger.error(f"OAuth connect: user {user_id} from init_token not found in DB")
        return _frontend_redirect(success=False, message="Account not found.")

    if not settings.META_APP_ID:
        return _frontend_redirect(
            success=False,
            message="Instagram connection is not configured on this server.",
        )

    # Generate the OAuth state bound to this tenant
    state = secrets.token_hex(32)
    _store_oauth_state(state, str(user.id))

    auth_url = _build_meta_auth_url(state)
    logger.info(f"Tenant {user.id} initiated Instagram OAuth")
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/callback")
async def instagram_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 of OAuth: Meta redirects here after user authorization.

    Security checks (in order):
    1. User denied access → graceful redirect to frontend with error.
    2. State missing → reject.
    3. State invalid/expired/reused → reject (Redis lookup + atomic delete).
    4. user_id from state (never from browser params).
    5. Code exchange server-side using META_APP_SECRET.
    6. Long-lived token exchange.
    7. Fetch IG Business Account info.
    8. Encrypt token; persist to DB scoped to the state-bound tenant.

    The access token is NEVER included in any redirect URL, response body,
    or log line.
    """
    # 1. Tenant denied OAuth
    if error:
        safe_err = (error_description or error)[:200]
        logger.warning(f"Meta OAuth denied by user: {error}")
        return _frontend_redirect(success=False, message=safe_err)

    # 2. State and code must both be present
    if not state or not code:
        logger.warning("OAuth callback missing state or code parameter")
        return _frontend_redirect(
            success=False,
            message="Invalid OAuth callback. Please try connecting again.",
        )

    # 3 & 4. Validate state and retrieve tenant user_id (single-use, atomic delete)
    user_id_str = _consume_oauth_state(state)
    if not user_id_str:
        logger.warning("OAuth callback: state invalid, expired, or already used")
        return _frontend_redirect(
            success=False,
            message="Authorization session expired or invalid. Please try again.",
        )

    # Fetch the tenant from DB using the server-side state-bound user_id.
    # NEVER use a user_id from the browser query string.
    from app.repositories.user_repository import user_repository
    import uuid
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.error("OAuth state contained invalid UUID — possible tampering")
        return _frontend_redirect(success=False, message="Invalid session. Please try again.")

    user = await user_repository.get_by_id(db, user_id)
    if not user:
        logger.error(f"OAuth callback: user {user_id} from state not found in DB")
        return _frontend_redirect(success=False, message="Account not found.")

    try:
        # 5. Exchange authorization code for short-lived token (server-side)
        clean_code = code.split("#")[0] if code else ""
        short_token_data = await instagram_service.exchange_code_for_token(
            code=clean_code,
            redirect_uri=settings.META_REDIRECT_URI,
        )
        short_token = short_token_data["access_token"]

        # 6. Upgrade to long-lived (~60 day) token
        long_token_data = await instagram_service.exchange_for_long_lived_token(short_token)
        long_token = long_token_data["access_token"]
        expires_in_seconds = long_token_data.get("expires_in", 5_184_000)  # 60 days default
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)

        # 7. Fetch Instagram Business Account info
        ig_info = await instagram_service.get_ig_user_info(long_token)
        ig_user_id = ig_info.get("id")
        ig_username = ig_info.get("username", "")
        ig_name = ig_info.get("name", "")
        ig_picture = ig_info.get("profile_picture_url", "")
        ig_followers = ig_info.get("followers_count", 0)
        ig_following = ig_info.get("follows_count", 0)
        ig_posts = ig_info.get("media_count", 0)

        # 8. Encrypt token before persisting
        encrypted_token = encrypt_token(long_token)

        # Persist to DB — scoped to the state-bound tenant only
        now = datetime.now(timezone.utc)
        user.instagram_user_id = ig_user_id
        user.instagram_token = encrypted_token
        user.token_expires_at = expires_at
        user.instagram_username = ig_username
        user.instagram_business_name = ig_name
        user.instagram_profile_picture = ig_picture
        user.instagram_followers_count = ig_followers
        user.instagram_following_count = ig_following
        user.instagram_posts_count = ig_posts
        user.instagram_category = ig_info.get("biography", "")[:100] if ig_info.get("biography") else None
        user.instagram_connected_at = now
        user.instagram_last_sync = now

        await db.commit()
        logger.info(f"Tenant {user.id} successfully connected Instagram @{ig_username}")

    except AppException as exc:
        logger.warning(f"OAuth callback AppException for tenant {user_id}: {exc.code}")
        return _frontend_redirect(success=False, message=exc.message)
    except Exception as exc:
        logger.error(f"OAuth callback unexpected error for tenant {user_id}: {type(exc).__name__}")
        return _frontend_redirect(success=False, message="Connection failed. Please try again.")

    return _frontend_redirect(success=True)


@router.get("/status")
async def instagram_status(
    current_user: User = Depends(get_current_user),
):
    """
    Return the Instagram connection status for the current tenant.
    NEVER returns the access token.
    """
    is_connected = bool(current_user.instagram_user_id and current_user.instagram_token)

    if not is_connected:
        return JSONResponse({"connected": False})

    # Check token expiry
    token_expired = False
    if current_user.token_expires_at:
        exp = current_user.token_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        token_expired = exp <= datetime.now(timezone.utc)

    return JSONResponse({
        "connected": True,
        "instagram_user_id": current_user.instagram_user_id,
        "username": current_user.instagram_username,
        "business_name": current_user.instagram_business_name,
        "profile_picture": current_user.instagram_profile_picture,
        "followers": current_user.instagram_followers_count,
        "following": current_user.instagram_following_count,
        "posts": current_user.instagram_posts_count,
        "connected_at": current_user.instagram_connected_at.isoformat() if current_user.instagram_connected_at else None,
        "expires_at": current_user.token_expires_at.isoformat() if current_user.token_expires_at else None,
        "token_expired": token_expired,
    })


@router.delete("/disconnect")
@router.post("/disconnect")  # Keep POST for backward-compat with existing frontend
async def instagram_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disconnect the current tenant's Instagram account.
    Idempotent — safe to call if already disconnected.
    Never allows a tenant to provide another tenant's connection ID.
    The tenant is identified exclusively by the JWT.
    """
    user = current_user  # already scoped to current tenant by JWT dependency

    user.instagram_user_id = None
    user.instagram_token = None
    user.token_expires_at = None
    user.instagram_username = None
    user.instagram_business_name = None
    user.instagram_profile_picture = None
    user.instagram_followers_count = 0
    user.instagram_following_count = 0
    user.instagram_posts_count = 0
    user.instagram_category = None
    user.instagram_connected_at = None
    user.instagram_last_sync = None

    await db.commit()
    logger.info(f"Tenant {current_user.id} disconnected Instagram")
    return {"message": "Instagram account disconnected successfully.", "connected": False}
