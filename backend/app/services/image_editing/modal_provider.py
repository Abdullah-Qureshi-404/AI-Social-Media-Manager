import base64
import io
import httpx
from typing import Optional
from PIL import Image

from app.core.config import settings
from app.core.logging import logger
from app.services.image_editing.base import BaseImageEditingProvider
from app.services.image_editing.prompt_builder import build_image_prompt


class ModalImageEditingProvider(BaseImageEditingProvider):
    """
    Image Editing Provider that delegates execution to an open-source image editing model (e.g. FLUX / ControlNet)
    hosted as an HTTP endpoint on Modal GPU infrastructure.
    """

    def __init__(self):
        self.endpoint_url = settings.MODAL_IMAGE_EDIT_URL.strip() if settings.MODAL_IMAGE_EDIT_URL else ""

    async def fetch_image_bytes(self, image_url: str) -> bytes:
        """Fetch raw image bytes from source URL."""
        if not image_url or "mock.local" in image_url or image_url.startswith("data:"):
            return self._create_fallback_image_bytes()
        try:
            headers = {"User-Agent": "SocialMediaManagerApp/1.0 (ModalPhotoAI)"}
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                response = await http_client.get(image_url, headers=headers, timeout=15.0)
                if response.status_code == 200:
                    return response.content
                logger.warning(f"[ModalProvider] Could not download source image from {image_url}. Status code: {response.status_code}")
        except Exception as exc:
            logger.warning(f"[ModalProvider] Failed to fetch source image from {image_url}: {exc}")
        return self._create_fallback_image_bytes()

    def _create_fallback_image_bytes(self) -> bytes:
        img = Image.new("RGB", (1080, 1080), color=(245, 230, 210))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

    async def enhance_image(
        self,
        image_url: str,
        preset_name: str = "golden_hour",
        custom_instruction: Optional[str] = None,
    ) -> bytes:
        """
        Send image editing request to Modal GPU HTTP endpoint.
        """
        if not self.endpoint_url:
            logger.error("[ModalProvider] MODAL_IMAGE_EDIT_URL is not set in environment or settings.")
            raise ValueError(
                "Modal image editing provider is active (IMAGE_PROVIDER=modal), but MODAL_IMAGE_EDIT_URL is not configured. "
                "Please add MODAL_IMAGE_EDIT_URL='https://your-modal-app.modal.run' to your backend/.env file."
            )

        logger.info(f"[ModalProvider] Preparing image editing request for Modal endpoint [{self.endpoint_url}]...")

        # 1. Download source image bytes
        source_bytes = await self.fetch_image_bytes(image_url)
        source_b64 = base64.b64encode(source_bytes).decode("utf-8")

        # 2. Build prompt/instructions for Modal model
        prompt = build_image_prompt(
            preset_name=preset_name,
            custom_instruction=custom_instruction,
            product_name="food item",
            reference_image="the original image",
        )

        payload = {
            "image_url": image_url,
            "image_base64": source_b64,
            "preset_name": preset_name,
            "preset_style": preset_style,
            "custom_instruction": user_custom,
            "prompt": prompt,
        }

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "SocialMediaManagerApp/1.0 (ModalClient)",
        }

        # 3. Call Modal HTTP Endpoint with timeout (120s for GPU inference)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
                logger.info(f"[ModalProvider] Dispatching HTTP POST to Modal GPU endpoint...")
                response = await client.post(self.endpoint_url, json=payload, headers=headers)

                if response.status_code != 200:
                    error_msg = f"[ModalProvider] Modal endpoint returned HTTP status {response.status_code}: {response.text[:300]}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)

                content_type = response.headers.get("content-type", "").lower()

                # Case A: Binary image payload returned directly
                if "image/" in content_type or response.content.startswith(b"\xff\xd8") or response.content.startswith(b"\x89PNG"):
                    logger.info(f"[ModalProvider] Received binary image bytes directly from Modal (Size: {len(response.content)} bytes).")
                    return response.content

                # Case B: JSON payload containing image_base64 or image_url
                data = response.json()
                if "image_base64" in data:
                    logger.info("[ModalProvider] Received base64-encoded image from Modal JSON response.")
                    return base64.b64decode(data["image_base64"])
                elif "image_url" in data:
                    logger.info(f"[ModalProvider] Received image_url from Modal JSON response: {data['image_url']}")
                    return await self.fetch_image_bytes(data["image_url"])
                else:
                    logger.error(f"[ModalProvider] Unexpected JSON response schema from Modal endpoint: {list(data.keys())}")
                    raise ValueError(f"Modal response missing 'image_base64' or raw image bytes: {data}")

        except httpx.TimeoutException as exc:
            logger.error(f"[ModalProvider] Request to Modal GPU endpoint timed out after 120s: {exc}")
            raise TimeoutError(f"Modal GPU image generation timed out: {exc}")
        except Exception as exc:
            logger.error(f"[ModalProvider] Error executing Modal image editing pipeline: {exc}")
            raise exc
