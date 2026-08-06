from datetime import datetime
from typing import Any, Dict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi.errors import RateLimitExceeded

from app.core.logging import logger


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message=message,
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized access"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class RateLimitExceededError(AppException):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )


class AIGenerationError(AppException):
    def __init__(self, message: str = "AI processing failed"):
        super().__init__(
            message=message,
            code="AI_GENERATION_FAILED",
            status_code=status.HTTP_502_BAD_GATEWAY,
        )


def build_error_envelope(
    code: str, message: str, request_id: str = "N/A"
) -> Dict[str, Any]:
    """Helper to build standardized JSON error envelopes."""
    return {
        "error": {
            "code": code,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "request_id": request_id,
        }
    }


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all global exception handler formatting unified error JSON."""
    request_id = getattr(request.state, "request_id", "N/A")

    if isinstance(exc, AppException):
        logger.warning(f"AppException [{exc.code}]: {exc.message} (request_id={request_id})")
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_envelope(exc.code, exc.message, request_id),
        )

    if isinstance(exc, StarletteHTTPException):
        code_map = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "RESOURCE_NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            429: "RATE_LIMIT_EXCEEDED",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_envelope(code, str(exc.detail), request_id),
        )

    if isinstance(exc, RequestValidationError):
        logger.warning(f"Validation error: {exc.errors()} (request_id={request_id})")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=build_error_envelope(
                "VALIDATION_ERROR",
                "Invalid request payload parameters",
                request_id,
            ),
        )

    if isinstance(exc, RateLimitExceeded):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content=build_error_envelope(
                "RATE_LIMIT_EXCEEDED",
                "Too many requests. Please slow down.",
                request_id,
            ),
        )

    # Unhandled internal server error
    logger.exception(f"Unhandled Exception: {str(exc)} (request_id={request_id})")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_envelope(
            "INTERNAL_SERVER_ERROR",
            "An unexpected internal error occurred",
            request_id,
        ),
    )
