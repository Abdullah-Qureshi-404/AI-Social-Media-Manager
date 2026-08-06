import uuid
import cloudinary
import cloudinary.uploader
from typing import Optional, Dict, Any

from app.core.config import settings
from app.core.logging import logger


class CloudinaryService:
    """2-Stage Cloudinary Staging & Permanent Media Lifecycle Manager."""

    def __init__(self):
        if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            self.enabled = True
        else:
            self.enabled = False
            logger.warning("Cloudinary credentials missing. Staging using local mock URLs.")

    async def upload_temporary_image(
        self, image_bytes: bytes, user_id: uuid.UUID
    ) -> Dict[str, str]:
        """
        Upload raw/edited image to temporary Cloudinary staging folder: temp/{user_id}/
        Returns dictionary with 'url' and 'public_id'.
        """
        if not self.enabled:
            mock_id = f"temp/{user_id}/{uuid.uuid4()}"
            return {
                "url": f"https://res.cloudinary.com/demo/image/upload/v1234/{mock_id}.jpg",
                "public_id": mock_id,
            }

        try:
            folder_path = f"social_media_manager/temp/{user_id}"
            response = cloudinary.uploader.upload(
                image_bytes,
                folder=folder_path,
                resource_type="image",
                overwrite=True,
            )
            return {
                "url": response.get("secure_url", response.get("url")),
                "public_id": response.get("public_id"),
            }
        except Exception as e:
            logger.exception(f"Cloudinary temp upload failed: {e}")
            raise RuntimeError(f"Cloudinary upload error: {str(e)}")

    async def upload_edited_image(
        self, image_bytes: bytes, user_id: uuid.UUID
    ) -> Dict[str, str]:
        """
        Upload canvas-edited image to Cloudinary folder: social_media_manager/edited/{user_id}/
        Returns dictionary with 'url' and 'public_id'.
        """
        if not self.enabled:
            mock_id = f"edited/{user_id}/{uuid.uuid4()}"
            return {
                "url": f"https://res.cloudinary.com/demo/image/upload/v1234/{mock_id}.jpg",
                "public_id": mock_id,
            }

        try:
            folder_path = f"social_media_manager/edited/{user_id}"
            response = cloudinary.uploader.upload(
                image_bytes,
                folder=folder_path,
                resource_type="image",
                overwrite=True,
            )
            return {
                "url": response.get("secure_url", response.get("url")),
                "public_id": response.get("public_id"),
            }
        except Exception as e:
            logger.exception(f"Cloudinary edited upload failed: {e}")
            raise RuntimeError(f"Cloudinary upload error: {str(e)}")

    async def promote_to_permanent(
        self, temp_url_or_id: str, user_id: uuid.UUID
    ) -> Dict[str, str]:
        """
        Promote approved image from staging (temp/{user_id}/) to permanent folder (perm/{user_id}/).
        """
        if not self.enabled:
            mock_id = f"perm/{user_id}/{uuid.uuid4()}"
            return {
                "url": f"https://res.cloudinary.com/demo/image/upload/v1235/{mock_id}.jpg",
                "public_id": mock_id,
            }

        try:
            target_folder = f"social_media_manager/perm/{user_id}"
            # Extract or rename asset into permanent folder
            response = cloudinary.uploader.upload(
                temp_url_or_id,
                folder=target_folder,
                resource_type="image",
            )
            return {
                "url": response.get("secure_url", response.get("url")),
                "public_id": response.get("public_id"),
            }
        except Exception as e:
            logger.exception(f"Cloudinary promotion failed: {e}")
            raise RuntimeError(f"Cloudinary promotion error: {str(e)}")

    async def delete_asset(self, public_id: str) -> bool:
        """Delete image asset from Cloudinary."""
        if not self.enabled:
            return True

        try:
            res = cloudinary.uploader.destroy(public_id)
            return res.get("result") == "ok"
        except Exception as e:
            logger.warning(f"Cloudinary deletion failed for {public_id}: {e}")
            return False


cloudinary_service = CloudinaryService()
