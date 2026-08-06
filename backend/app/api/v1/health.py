from fastapi import APIRouter, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/health", tags=["Health Checks"])


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


@router.get("/liveness", response_model=HealthResponse)
async def liveness_check():
    """Simple liveness probe for checking if the FastAPI application is alive."""
    return HealthResponse(
        status="healthy",
        service="AI Social Media Manager API",
        environment="development",
    )


@router.get("/readiness", response_model=HealthResponse)
async def readiness_check(response: Response):
    """Readiness probe for verifying downstream service connectivity."""
    # Readiness checks for DB and Redis will be attached in subsequent phases
    return HealthResponse(
        status="ready",
        service="AI Social Media Manager API",
        environment="development",
    )
