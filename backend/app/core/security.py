import uuid
import math
import redis
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import logger

# Cryptography context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Redis connection for token blocklisting
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def hash_password(password: str) -> str:
    """Hash plain text password using Bcrypt (truncated to max 72 bytes for Bcrypt 4.x compat)."""
    safe_pass = password[:72]
    return pwd_context.hash(safe_pass)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored Bcrypt hash."""
    safe_pass = plain_password[:72]
    return pwd_context.verify(safe_pass, hashed_password)


def _ttl_from_exp(exp_timestamp: Optional[int], minimum_seconds: int = 60) -> int:
    """
    Compute the remaining lifetime of a token in seconds from its `exp` Unix timestamp.
    Returns at least `minimum_seconds` so short-lived or already-expired tokens are
    still briefly blocklisted (prevents race-condition reuse within the same second).
    """
    if not exp_timestamp:
        return 86400  # Safe fallback: 24 hours
    now_ts = math.floor(datetime.now(timezone.utc).timestamp())
    remaining = exp_timestamp - now_ts
    return max(remaining, minimum_seconds)


def add_token_to_blocklist(jti: str, exp_timestamp: Optional[int] = None) -> None:
    """
    Stores the token JTI in Redis with TTL matching actual remaining token lifetime.
    If `exp_timestamp` is not provided, falls back to a 24-hour TTL.
    """
    if not jti:
        return
    ttl = _ttl_from_exp(exp_timestamp)
    try:
        redis_client.setex(f"blocklist:{jti}", ttl, "true")
    except Exception as e:
        logger.warning(f"Redis blocklist write failed for jti {jti}: {e}")


def is_token_blocked(jti: str) -> bool:
    """Checks if JTI exists in Redis blocklist. Fails secure on Redis error."""
    if not jti:
        return False
    try:
        return bool(redis_client.get(f"blocklist:{jti}"))
    except Exception as e:
        logger.warning(f"Redis blocklist check failed for jti {jti}: {e}")
        return True  # Fail secure — if we can't check, treat as blocked


def create_access_token(
    user_id: uuid.UUID, expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token expiring in 24 hours with unique JTI."""
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create JWT refresh token expiring in 7 days with unique JTI."""
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def revoke_user_tokens(user_id: uuid.UUID) -> None:
    """Record a global token revocation timestamp for user_id in Redis (TTL 24h)."""
    try:
        now_ts = math.floor(datetime.now(timezone.utc).timestamp())
        redis_client.setex(f"user_revoked:{user_id}", 86400, str(now_ts))
    except Exception as e:
        logger.warning(f"Failed to set user revocation for {user_id}: {e}")


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token payload, enforcing blocklist and user revocation checks."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        jti = payload.get("jti")
        if jti and is_token_blocked(jti):
            return None

        # Check for user-level session revocation (e.g. after password reset)
        user_id_str = payload.get("sub")
        iat = payload.get("iat")
        if user_id_str and iat:
            try:
                revoked_ts_str = redis_client.get(f"user_revoked:{user_id_str}")
                if revoked_ts_str:
                    revoked_ts = int(revoked_ts_str)
                    if iat <= revoked_ts:
                        return None
            except Exception:
                pass

        return payload
    except JWTError:
        return None


def decode_token_claims(token: str) -> Optional[Dict[str, Any]]:
    """
    Extract claims from a JWT without verifying the signature or expiry.
    Used ONLY during logout to read the `exp` / `jti` from the refresh token
    so we can set an accurate blocklist TTL.  Never use for authentication.
    """
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
    except JWTError:
        return None
