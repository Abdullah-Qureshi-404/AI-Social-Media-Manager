import asyncio
import uuid
from typing import Optional
from celery import shared_task

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.post import PostStatusEnum
from app.repositories.post_repository import post_repository
from app.repositories.user_repository import user_repository
from app.services.caption_ai import caption_ai_service


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def generate_caption_task(
    self, post_id_str: str, user_id_str: str, user_instruction: Optional[str] = None
):
    """
    Granular Celery Task: Generates 3 caption options and hashtags using Gemini 1.5 Flash text API.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _async_generate_caption(self, post_id_str, user_id_str, user_instruction)
    )


async def _async_generate_caption(
    task, post_id_str: str, user_id_str: str, user_instruction: Optional[str] = None
):
    post_id = uuid.UUID(post_id_str)
    user_id = uuid.UUID(user_id_str)

    async with AsyncSessionLocal() as db:
        try:
            post = await post_repository.get_by_id(db, post_id, user_id)
            user = await user_repository.get_by_id(db, user_id)

            if not post or not user:
                logger.error(f"Post {post_id} or user {user_id} not found")
                return

            brand_voice = user.brand_voice or "friendly"
            image_target = post.current_edited_image_url or post.original_image_url

            # 1. Call Gemini 1.5 Flash text service
            caption_data = await caption_ai_service.generate_captions_and_hashtags(
                image_url=image_target,
                brand_voice=brand_voice,
                user_instruction=user_instruction,
            )

            # Default to first casual caption option
            captions = caption_data.get("captions", [])
            default_caption = captions[0]["text"] if captions else "Enjoy our delicious food!"

            # 2. Update post state to CAPTION_READY
            post.caption = default_caption
            post.status = PostStatusEnum.CAPTION_READY
            await db.commit()

            logger.info(f"Generated captions for post {post_id} with brand_voice [{brand_voice}]")
            return caption_data

        except Exception as exc:
            await db.rollback()
            logger.exception(f"Error generating caption for post {post_id}: {exc}")
            if task:
                raise task.retry(exc=exc)
            raise exc
