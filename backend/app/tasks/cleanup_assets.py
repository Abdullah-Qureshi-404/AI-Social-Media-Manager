import asyncio
from datetime import datetime, timedelta
from celery import shared_task
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.post import Post, PostStatusEnum
from app.services.cloudinary_service import cloudinary_service


@shared_task(name="app.tasks.cleanup_assets.cleanup_temp_images_task")
def cleanup_temp_images_task():
    """
    Nightly Celery Beat Task: Purges abandoned temporary Cloudinary staging assets
    older than 24 hours while strictly preserving tenant boundaries (temp/{user_id}/).
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_async_cleanup_temp_assets())


async def _async_cleanup_temp_assets():
    cutoff = datetime.utcnow() - timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        # Select abandoned posts created >24h ago still in un-approved temporary state
        stmt = select(Post).where(
            Post.status.in_([PostStatusEnum.UPLOADED, PostStatusEnum.IMAGE_READY]),
            Post.created_at <= cutoff,
            Post.deleted_at.is_(None),
        )
        result = await db.execute(stmt)
        abandoned_posts = list(result.scalars().all())

        if not abandoned_posts:
            logger.info("No abandoned temporary assets found for cleanup.")
            return 0

        logger.info(f"Found {len(abandoned_posts)} abandoned temporary draft posts for cleanup")
        cleaned_count = 0

        for post in abandoned_posts:
            # Delete staging Cloudinary asset if temp_image_url exists
            if post.temp_image_url and "temp/" in post.temp_image_url:
                try:
                    # Extract public_id path scoped to tenant temp/{user_id}/
                    public_id = post.temp_image_url.split("/")[-1].split(".")[0]
                    tenant_public_id = f"social_media_manager/temp/{post.user_id}/{public_id}"
                    await cloudinary_service.delete_asset(tenant_public_id)
                    cleaned_count += 1
                except Exception as e:
                    logger.warning(f"Failed to delete temp Cloudinary asset for post {post.id}: {e}")

            # Soft-delete abandoned post record
            post.deleted_at = datetime.utcnow()
            await db.commit()

        return cleaned_count
