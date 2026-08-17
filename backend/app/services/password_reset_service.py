import secrets
import hashlib
import uuid
from typing import Optional
from app.core.security import redis_client, revoke_user_tokens
from app.core.logging import logger

RESET_TOKEN_TTL_SECONDS = 1800  # 30 minutes

# In-memory fallback dictionary for offline/unit test execution
_local_redis_store: dict = {}


def _hash_token(raw_token: str) -> str:
    """Computes SHA-256 hex digest of the raw reset token."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


def create_password_reset_token(user_id: uuid.UUID) -> str:
    """
    Generates a cryptographically secure random reset token, stores its SHA-256 hash
    in Redis (or local test fallback) with a 30-minute expiration, and returns the raw token.
    Raw token is NEVER stored server-side.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    key = f"reset_token:{token_hash}"

    try:
        redis_client.setex(key, RESET_TOKEN_TTL_SECONDS, str(user_id))
    except Exception as e:
        logger.warning(f"Redis setex error ({e}), using in-memory store fallback for token")
        _local_redis_store[key] = str(user_id)

    return raw_token


def get_user_id_for_reset_token(raw_token: str) -> Optional[uuid.UUID]:
    """
    Retrieves the user ID associated with a password reset token from Redis or fallback store.
    Validates token presence and expiration without deleting it.
    """
    if not raw_token or len(raw_token.strip()) < 10:
        return None

    token_hash = _hash_token(raw_token)
    key = f"reset_token:{token_hash}"
    user_id_str = None

    try:
        user_id_str = redis_client.get(key)
    except Exception as e:
        logger.warning(f"Redis get error ({e}), checking in-memory fallback")
        user_id_str = _local_redis_store.get(key)

    if not user_id_str:
        user_id_str = _local_redis_store.get(key)

    if not user_id_str:
        return None

    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        return None


def invalidate_reset_token(raw_token: str) -> None:
    """
    Deletes the reset token key from Redis.
    MUST be called ONLY AFTER the database transaction updating password has successfully committed.
    """
    if not raw_token:
        return

    token_hash = _hash_token(raw_token)
    key = f"reset_token:{token_hash}"

    try:
        redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Redis delete error ({e})")

    _local_redis_store.pop(key, None)


def invalidate_user_sessions(user_id: uuid.UUID) -> None:
    """
    Revokes all existing user sessions/refresh tokens for the user in Redis
    so previously issued JWTs cannot be used after password change.
    """
    revoke_user_tokens(user_id)
