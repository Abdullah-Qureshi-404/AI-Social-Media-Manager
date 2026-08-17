import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Locations for .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent

BACKEND_ENV = BACKEND_DIR / ".env"
ROOT_ENV = ROOT_DIR / ".env"

selected_env = BACKEND_ENV if BACKEND_ENV.exists() else (ROOT_ENV if ROOT_ENV.exists() else ".env")


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Social Media Manager"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/social_media_manager"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # AI & Third Party APIs
    IMAGE_PROVIDER: str = "modal"
    MODAL_IMAGE_EDIT_URL: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_IMAGE_MODEL: str = "gpt-image-1"
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    # Full URL the Meta OAuth callback hits — must match exactly in Meta Developer Console
    # Example: https://api.yourdomain.com/api/v1/tenant/instagram/callback
    META_REDIRECT_URI: str = "http://localhost:8000/api/v1/tenant/instagram/callback"
    # URL of the frontend SPA — used to redirect browser after OAuth completes
    FRONTEND_URL: str = "http://localhost:5173"
    # Fernet key for encrypting Instagram access tokens at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    FERNET_SECRET_KEY: str = ""

    # SMTP & Email Settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@aisocialmanager.com"
    EMAIL_STARTTLS: bool = True

    model_config = SettingsConfigDict(
        env_file=str(selected_env),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
