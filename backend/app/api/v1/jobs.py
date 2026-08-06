import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Header, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.middleware.exception_handler import UnauthorizedError
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.services.job_event_service import job_event_service

router = APIRouter(prefix="/jobs", tags=["Jobs & SSE Status"])


async def get_current_user_from_query_or_header(
    request: Request,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Special authentication dependency for SSE endpoints accepting query param or header."""
    jwt_token = token or (
        authorization.replace("Bearer ", "")
        if authorization else None
    )
    if not jwt_token:
        raise UnauthorizedError("Missing authentication token")

    payload = decode_token(jwt_token)
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

    request.state.user_id = str(user.id)
    return user


@router.get("/{job_id}/stream")
async def stream_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user_from_query_or_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Real-time Server-Sent Events (SSE) stream endpoint backed by Redis Pub/Sub.
    Subscribes to live worker progress broadcasts for Celery task 'job_id'.
    """

    async def event_generator():
        async for data_str in job_event_service.subscribe_job_stream(job_id):
            yield {"event": "job_update", "data": data_str}

    return EventSourceResponse(event_generator())
