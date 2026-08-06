"""
Application Configuration Constants
Centralized constants to prevent magic numbers across backend microservices.
"""

# File Upload Constraints
MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp"}

# Image Processing Dimensions
TARGET_IMAGE_DIMENSION: int = 1080  # 1080x1080 square Instagram standard

# AI Rate Limits & Cost Safeguards
MAX_FREE_EDITS_PER_POST: int = 3
RATE_LIMIT_AI_PER_HOUR: int = 10

# Celery Task Scheduler Settings
CELERY_PUBLISH_POLL_INTERVAL_SEC: int = 60
MAX_PUBLISH_RETRIES: int = 3
PUBLISH_RETRY_BACKOFF_TIMINGS: list[int] = [60, 300, 900]  # 1m, 5m, 15m

# Meta Token Management
INSTAGRAM_TOKEN_REFRESH_THRESHOLD_DAYS: int = 10
