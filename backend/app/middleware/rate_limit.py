from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core.config import settings


def get_tenant_key(request: Request) -> str:
    """
    Extract tenant key for rate limiting.
    Uses authenticated user_id if present in request.state, otherwise falls back to IP address.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"tenant:{user_id}"
    return get_remote_address(request)


# Initialize Slowapi Limiter backed by Redis
limiter = Limiter(
    key_func=get_tenant_key,
    storage_uri=settings.REDIS_URL,
    default_limits=["100/minute"],
)
