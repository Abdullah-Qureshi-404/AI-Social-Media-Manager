import base64
import io
from typing import Optional

import httpx
from PIL import Image
from openai import AsyncOpenAI, OpenAIError

from app.core.config import settings
from app.core.logging import logger
from app.utils.image_resizer import resize_and_pad_image
from app.services.image_editing.base import BaseImageEditingProvider
from app.services.image_editing.prompt_builder import build_image_prompt


class OpenAIImageEditingProvider(BaseImageEditingProvider):
    """
    Production OpenAI image editing provider using gpt-image-1 (or configured model).
    Executes image-to-image commercial food photography enhancement.
    """

    def __init__(self):
        self.api_key = (
            settings.OPENAI_API_KEY.strip()
            if settings.OPENAI_API_KEY
            else ""
        )
        self.model_name = (
            settings.OPENAI_IMAGE_MODEL.strip()
            if settings.OPENAI_IMAGE_MODEL
            else "gpt-image-1"
        )
        self.client = (
            AsyncOpenAI(api_key=self.api_key)
            if self.api_key
            else None
        )

    async def fetch_image_bytes(self, image_source: str) -> bytes:
        """
        Fetch raw image bytes from local file path or HTTP/HTTPS URL.
        """
        try:
            clean_source = image_source
            if clean_source.startswith("file://"):
                clean_source = clean_source.replace("file://", "")

            # Local file path
            if not clean_source.startswith(("http://", "https://")):
                with open(clean_source, "rb") as f:
                    return f.read()

            # HTTP URL download
            headers = {"User-Agent": "SocialMediaManagerApp/1.0 (OpenAIFoodPhotoAI)"}
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(clean_source, headers=headers, timeout=20.0)
                response.raise_for_status()
                return response.content

        except Exception as exc:
            logger.error(f"[OpenAI] Error details: Image loading failed for '{image_source}' - {exc}")
            raise RuntimeError(f"Failed to load image from '{image_source}': {exc}")

    def _prepare_png(self, image_bytes: bytes) -> bytes:
        """
        Convert input image bytes to a square 1024x1024 RGBA PNG format
        as required by OpenAI image editing endpoints.
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        width, height = img.size
        size = max(width, height)

        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        canvas.paste(img, ((size - width) // 2, (size - height) // 2))
        canvas = canvas.resize((1024, 1024), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        canvas.save(buffer, format="PNG")
        return buffer.getvalue()

    async def enhance_image(
        self,
        image_url: str,
        preset_name: str = "golden_hour",
        custom_instruction: Optional[str] = None,
    ) -> bytes:
        """
        Production image enhancement using OpenAI Images API.
        Raises exceptions on failure to allow Celery task retries and error reporting.
        """
        logger.info(f"[OpenAI] Model: {self.model_name}")

        if not self.client or not self.api_key:
            logger.error("[OpenAI] Error details: OPENAI_API_KEY is not configured in environment/settings.")
            raise ValueError("OPENAI_API_KEY is not configured in environment or settings.")

        # Download and prepare input image
        raw_bytes = await self.fetch_image_bytes(image_url)
        resized_bytes = resize_and_pad_image(raw_bytes)
        png_bytes = self._prepare_png(resized_bytes)

        # Assemble prompt: Master Preset Prompt + Common Preservation Rules + Additional User Instructions
        prompt = build_image_prompt(
            preset_name=preset_name,
            custom_instruction=custom_instruction,
            product_name="food item",
            reference_image="the original image",
        )

        try:
            logger.info(f"[OpenAI] Sending image edit request using model [{self.model_name}]...")
            response = await self.client.images.edit(
                model=self.model_name,
                image=("image.png", png_bytes, "image/png"),
                prompt=prompt,
                size="1024x1024",
                n=1,
            )

            if not response.data:
                logger.error("[OpenAI] Error details: OpenAI API returned an empty response data list.")
                raise RuntimeError("OpenAI API returned an empty response data list.")

            image_data = response.data[0]

            if hasattr(image_data, "b64_json") and image_data.b64_json:
                logger.info("[OpenAI] Image edit successful")
                return base64.b64decode(image_data.b64_json)

            if hasattr(image_data, "url") and image_data.url:
                logger.info("[OpenAI] Image edit successful")
                return await self.fetch_image_bytes(image_data.url)

            logger.error("[OpenAI] Error details: OpenAI API response contains neither b64_json nor url.")
            raise RuntimeError("OpenAI API response contains neither b64_json nor url.")

        except OpenAIError as exc:
            logger.error(f"[OpenAI] Error details: OpenAI API call failed - {exc}")
            raise
        except Exception as exc:
            logger.error(f"[OpenAI] Error details: Image edit failed - {exc}")
            raise