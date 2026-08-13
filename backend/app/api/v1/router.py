from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.posts import router as posts_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.users import router as users_router, tenant_router
from app.api.v1.menu import router as menu_router
from app.api.v1.instagram_oauth import router as instagram_oauth_router

api_v1_router = APIRouter(prefix="/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(posts_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(tenant_router)
api_v1_router.include_router(menu_router)
api_v1_router.include_router(instagram_oauth_router)
