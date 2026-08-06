import asyncio
import uuid
from typing import Optional
from celery import shared_task

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.post import PostStatusEnum
from app.repositories.post_repository import post_repository
from app.services.image_ai import image_ai_service
from app.services.cloudinary_service import cloudinary_service
from app.services.job_event_service import job_event_service
from app.constants import MAX_FREE_EDITS_PER_POST


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_image_task(
    self,
    post_id_str: str,
    user_id_str: str,
    preset_name: str = "golden_hour",
    custom_instruction: Optional[str] = None,
    job_id: Optional[str] = None,
):
    """
    Granular Celery Task: Performs AI photo enhancement via Gemini 2.5 Flash Image,
    emits real-time Redis Pub/Sub SSE progress events, stages output in Cloudinary,
    and updates post state to IMAGE_READY.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(
        _async_process_image(self, post_id_str, user_id_str, preset_name, custom_instruction, job_id)
    )


async def _async_process_image(
    task,
    post_id_str: str,
    user_id_str: str,
    preset_name: str,
    custom_instruction: Optional[str],
    job_id: Optional[str],
):
    post_id = uuid.UUID(post_id_str)
    user_id = uuid.UUID(user_id_str)
    active_job = job_id or f"job-{uuid.uuid4()}"

    async with AsyncSessionLocal() as db:
        try:
            # Emit Progress: 20%
            await job_event_service.publish_job_update(
                active_job, user_id_str, "PROCESSING_IMAGE", 20, "Fetching raw photo and validating edit limits..."
            )

            post = await post_repository.get_post_with_versions(db, post_id, user_id)
            if not post:
                logger.error(f"Post {post_id} not found for tenant {user_id}")
                return

            # Enforce 3-Edit Limit Safeguard
            max_allowed = post.max_edits_allowed or MAX_FREE_EDITS_PER_POST
            if post.edit_count >= max_allowed:
                await job_event_service.publish_job_update(
                    active_job, user_id_str, "FAILED", 100, f"Maximum edit limit of {max_allowed} reached."
                )
                post.status = PostStatusEnum.IMAGE_READY
                post.error_message = f"Maximum edit limit of {max_allowed} edits reached for this post."
                await db.commit()
                return

            post.status = PostStatusEnum.PROCESSING_IMAGE
            await db.commit()

            # Emit Progress: 50%
            await job_event_service.publish_job_update(
                active_job, user_id_str, "PROCESSING_IMAGE", 50, f"Applying style preset [{preset_name}]..."
            )

            # 1. Trigger Image Editing Service
            edited_bytes = await image_ai_service.enhance_image(
                image_url=post.original_image_url,
                preset_name=preset_name,
                custom_instruction=custom_instruction,
            )

            # Emit Progress: 80%
            await job_event_service.publish_job_update(
                active_job, user_id_str, "UPLOADING", 80, "Staging enhanced image..."
            )

            # 2. Stage edited image in Cloudinary temporary staging folder (tenant scoped)
            upload_res = await cloudinary_service.upload_temporary_image(edited_bytes, user_id)
            edited_url = upload_res["url"]

            # 3. Add to PostImageVersion stack for undo/redo comparison (using DB max version query to avoid unique constraint violations)
            max_ver = await post_repository.get_max_version_number(db, post.id)
            new_version_num = max_ver + 1

            await post_repository.add_image_version(
                db,
                post_id=post.id,
                version_number=new_version_num,
                image_url=edited_url,
                prompt_used=custom_instruction,
                preset_style=preset_name,
            )

            # 4. Update Post Entity state
            post.current_edited_image_url = edited_url
            post.temp_image_url = edited_url
            post.edit_count += 1
            post.error_message = None
            post.status = PostStatusEnum.IMAGE_READY
            await db.commit()

            # Emit Progress: 100% (READY)
            await job_event_service.publish_job_update(
                active_job, user_id_str, "READY", 100, "Photo enhancement complete! Image ready for review."
            )

            logger.info(f"Successfully enhanced post {post_id} (version {new_version_num}/{max_allowed})")

        except Exception as exc:
            await db.rollback()
            clean_err = str(exc).split("[SQL:")[0].strip() if "[SQL:" in str(exc) else str(exc)
            await job_event_service.publish_job_update(
                active_job, user_id_str, "FAILED", 100, f"Photo enhancement failed: {clean_err}"
            )
            logger.exception(f"Error in process_image_task for post {post_id}: {exc}")
            if task:
                raise task.retry(exc=exc)
            raise exc
