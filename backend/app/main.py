from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.exception_handler import global_exception_handler
from app.middleware.rate_limit import limiter
from app.api.v1.router import api_v1_router

# Initialize structured logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Tenant SaaS API for AI Photo Enhancement & Instagram Scheduling",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach Slowapi Limiter State
app.state.limiter = limiter

# Register Global Exception Handlers
app.add_exception_handler(Exception, global_exception_handler)


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Swagger UI needs its own scripts/styles.
    # Don't apply CSP to Swagger documentation in development.
    if request.url.path not in ["/docs", "/redoc"]:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src 'self' "
            "https://api.cloudinary.com "
            "https://*.supabase.co "
            "https://res.cloudinary.com;"
        )

    return response


# Attach Middlewares
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite Dev Server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://red-rock-05a679710.7.azurestaticapps.net",  # Production frontend Azure Static Web App
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Master API Router
app.include_router(api_v1_router, prefix="/api")


import asyncio
from app.tasks.publish_post import _async_publish_due_posts


async def _periodic_due_posts_scheduler():
    """
    Lightweight in-process background runner for single-container deployments.
    Polls every 30 seconds and safely processes due posts using atomic FOR UPDATE SKIP LOCKED.
    """
    logger.info("Starting in-process scheduled posts worker loop (30s interval)")
    while True:
        try:
            claimed_count = await _async_publish_due_posts()
            if claimed_count > 0:
                logger.info(f"In-process scheduler successfully published {claimed_count} due post(s)")
        except asyncio.CancelledError:
            logger.info("In-process scheduled posts worker loop stopped")
            break
        except Exception as e:
            logger.error(f"Error in periodic post scheduler loop: {e}")
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            break


@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode")
    # Start in-process background post scheduler loop
    app.state.scheduler_task = asyncio.create_task(_periodic_due_posts_scheduler())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"Shutting down {settings.PROJECT_NAME}")
    if hasattr(app.state, "scheduler_task") and app.state.scheduler_task:
        app.state.scheduler_task.cancel()


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/api/v1/health/liveness",
    }
