import asyncio
from datetime import datetime
from celery import shared_task
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.post import Post, PostStatusEnum
from app.models.analytics import Analytics
from app.services.instagram_service import instagram_service


@shared_task(name="app.tasks.fetch_analytics.fetch_published_analytics_task")
def fetch_published_analytics_task():
    """
    Periodic Celery Task: Polls Meta Graph API for performance insights (likes, reach, saves)
    on published posts.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_async_fetch_analytics())


async def _async_fetch_analytics():
    async with AsyncSessionLocal() as db:
        # Select published posts with valid instagram_media_id
        stmt = (
            select(Post)
            .where(
                Post.status == PostStatusEnum.PUBLISHED,
                Post.instagram_media_id.isnot(None),
                Post.deleted_at.is_(None),
            )
            .limit(20)
        )
        result = await db.execute(stmt)
        published_posts = list(result.scalars().all())

        if not published_posts:
            return 0

        updated_count = 0
        for post in published_posts:
            user = post.user
            if not user or not user.instagram_token:
                continue

            try:
                metrics = await instagram_service.fetch_post_analytics(
                    post.instagram_media_id, user.instagram_token
                )

                # Update or create analytics entity
                analytics = post.analytics
                if not analytics:
                    analytics = Analytics(post_id=post.id)
                    db.add(analytics)

                analytics.likes = metrics.get("likes", 0)
                analytics.reach = metrics.get("reach", 0)
                analytics.saves = metrics.get("saves", 0)
                analytics.comments = metrics.get("comments", 0)
                analytics.fetched_at = datetime.utcnow()

                await db.commit()
                updated_count += 1
            except Exception as e:
                await db.rollback()
                logger.warning(f"Error fetching analytics for post {post.id}: {e}")

        return updated_count
