import asyncio
from datetime import datetime
from celery import shared_task

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.core.token_encryption import decrypt_token
from app.models.post import PostStatusEnum
from app.repositories.post_repository import post_repository
from app.repositories.user_repository import user_repository
from app.services.instagram_service import instagram_service


@shared_task(name="app.tasks.publish_post.publish_due_posts_task")
def publish_due_posts_task():
    """
    Periodic Celery Beat Task: Scans and claims due posts using FOR UPDATE SKIP LOCKED
    and triggers Instagram Graph API publishing.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_async_publish_due_posts())


async def _async_publish_due_posts():
    async with AsyncSessionLocal() as db:
        # 1. Atomically claim due posts to prevent duplicate execution
        due_posts = await post_repository.get_and_claim_due_posts(db, limit=10)

        if not due_posts:
            return 0

        logger.info(f"Background worker claimed {len(due_posts)} due post(s) for publishing")

        for post in due_posts:
            try:
                # Eager load tenant user via repository
                user = await user_repository.get_by_id(db, post.user_id)
                if not user or not user.instagram_user_id or not user.instagram_token:
                    logger.error(f"Post {post.id} tenant missing Meta Instagram Business credentials")
                    post.status = PostStatusEnum.FAILED
                    post.error_message = "Missing Instagram Business credentials or access token"
                    await db.commit()
                    continue

                # 1. FIX 3: Check Instagram access token expiration date
                now_utc = datetime.utcnow()
                if user.token_expires_at:
                    token_exp = user.token_expires_at.replace(tzinfo=None) if user.token_expires_at.tzinfo else user.token_expires_at
                    if token_exp <= now_utc:
                        logger.error(f"Post {post.id} tenant Instagram access token expired on {user.token_expires_at}")
                        post.status = PostStatusEnum.FAILED
                        post.error_message = "Instagram access token expired. Please reconnect Instagram in Settings."
                        await db.commit()
                        continue

                # 2. FIX 4: Check Meta 25 posts per 24 hours rate limit
                published_24h_count = await post_repository.count_published_last_24h(db, user.id)
                if published_24h_count >= 25:
                    logger.warning(f"Tenant {user.id} reached 25 posts/24h rate limit (count={published_24h_count})")
                    post.status = PostStatusEnum.FAILED
                    post.error_message = "Daily Instagram post limit reached (25 posts per 24 hours). Post will need to be rescheduled."
                    await db.commit()
                    continue

                # 3. Decrypt the stored access token before using it
                try:
                    plaintext_token = decrypt_token(user.instagram_token)
                except Exception:
                    logger.error(f"Post {post.id}: Instagram token decryption failed for tenant {user.id}")
                    post.status = PostStatusEnum.FAILED
                    post.error_message = "Instagram token is corrupted. Please reconnect Instagram in Settings."
                    await db.commit()
                    continue

                if not plaintext_token:
                    logger.error(f"Post {post.id}: Instagram token is empty after decryption for tenant {user.id}")
                    post.status = PostStatusEnum.FAILED
                    post.error_message = "Missing Instagram access token. Please reconnect Instagram in Settings."
                    await db.commit()
                    continue

                # 4. Publish post via Meta Instagram Graph API
                image_target_url = post.permanent_image_url or post.temp_image_url or post.original_image_url
                media_id = await instagram_service.publish_photo_post(
                    instagram_user_id=user.instagram_user_id,
                    access_token=plaintext_token,
                    image_url=image_target_url,
                    caption=post.caption or "",
                )

                # 3. Mark post as PUBLISHED
                post.instagram_media_id = media_id
                post.status = PostStatusEnum.PUBLISHED
                post.published_at = datetime.utcnow()
                post.error_message = None
                await db.commit()

                logger.info(f"Post {post.id} successfully published to Instagram (media_id={media_id})")

            except Exception as e:
                await db.rollback()
                logger.exception(f"Failed to publish post {post.id}: {e}")

                post.retry_count += 1
                post.status = PostStatusEnum.FAILED
                post.error_message = str(e)
                await db.commit()

        return len(due_posts)
