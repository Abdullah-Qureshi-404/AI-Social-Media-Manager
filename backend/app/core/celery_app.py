from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.constants import CELERY_PUBLISH_POLL_INTERVAL_SEC

celery_app = Celery(
    "social_media_manager_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.process_image",
        "app.tasks.generate_caption",
        "app.tasks.render_overlay",
        "app.tasks.publish_post",
        "app.tasks.refresh_tokens",
        "app.tasks.cleanup_assets",
        "app.tasks.fetch_analytics",
        "app.tasks.strategy_tasks",
    ],
)

# Celery Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_max_tasks_per_child=100,  # Restart worker child processes to prevent memory leaks
)

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    "publish-due-scheduled-posts-every-60s": {
        "task": "app.tasks.publish_post.publish_due_posts_task",
        "schedule": CELERY_PUBLISH_POLL_INTERVAL_SEC,
    },
    "refresh-expiring-instagram-tokens-daily": {
        "task": "app.tasks.refresh_tokens.refresh_expiring_tokens_task",
        "schedule": crontab(hour=0, minute=0),  # Midnight daily
    },
    "cleanup-orphan-temp-cloudinary-images-nightly": {
        "task": "app.tasks.cleanup_assets.cleanup_temp_images_task",
        "schedule": crontab(hour=3, minute=0),  # 03:00 AM daily
    },
    "fetch-post-analytics-every-6-hours": {
        "task": "app.tasks.fetch_analytics.fetch_published_analytics_task",
        "schedule": crontab(hour="*/6", minute=0),  # Every 6 hours
    },
    "generate-daily-content-strategy": {
        "task": "app.tasks.strategy_tasks.run_all_strategy_generations_task",
        "schedule": crontab(hour=1, minute=0),  # 01:00 AM daily
    },
}
