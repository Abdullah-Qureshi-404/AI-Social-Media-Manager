import uuid
from typing import Optional
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.middleware.exception_handler import UnauthorizedError
from app.models.user import User
from app.repositories.user_repository import user_repository

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Mandatory authentication dependency extracting tenant user_id from JWT.
    Attaches user_id to request.state for rate limiting and logging.
    """
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials
    else:
        token = request.query_params.get("token")

    if not token:
        raise UnauthorizedError("Missing or invalid authentication token")

    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Invalid or expired access token")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedError("Invalid token subject payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError("Malformed user ID in token")

    user = await user_repository.get_by_id(db, user_id)
    if not user:
        raise UnauthorizedError("User account no longer exists")

    # Attach tenant user_id to request state
    request.state.user_id = str(user.id)
    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Optional authentication dependency returning None for unauthenticated calls."""
    if not credentials or not credentials.credentials:
        return None

    try:
        return await get_current_user(request, credentials, db)
    except UnauthorizedError:
        return None
