import io
import httpx
from typing import Optional
from PIL import Image, ImageEnhance, ImageFilter
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.core.config import settings
from app.core.logging import logger
from app.utils.image_resizer import resize_and_pad_image
from app.services.image_editing.base import BaseImageEditingProvider
from app.services.image_editing.prompt_builder import build_image_prompt


def is_rate_limit_or_api_error(exception: Exception) -> bool:
    err_str = str(exception).lower()
    return "429" in err_str or "rate limit" in err_str or "resource_exhausted" in err_str or "503" in err_str


class GeminiImageEditingProvider(BaseImageEditingProvider):
    """
    Multimodal Food & Product Image Enhancement Provider using Google Gemini 2.5 Flash Image.
    
    NOTE & PREREQUISITES:
    - Model: gemini-2.5-flash-image
    - Modal Config: response_modalities=['IMAGE', 'TEXT']
    - Access: Requires a billing-enabled Google AI Studio API key / GCP project ($0.039/image).
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    async def fetch_image_bytes(self, image_url: str) -> bytes:
        if not image_url or "mock.local" in image_url or image_url.startswith("data:"):
            return self._create_fallback_image_bytes()
        try:
            headers = {"User-Agent": "SocialMediaManagerApp/1.0 (GeminiPhotoAI)"}
            async with httpx.AsyncClient(follow_redirects=True) as http_client:
                response = await http_client.get(image_url, headers=headers, timeout=15.0)
                if response.status_code == 200:
                    return response.content
                logger.warning(f"[GeminiProvider] Could not download image from {image_url}. Status code: {response.status_code}")
        except Exception as exc:
            logger.warning(f"[GeminiProvider] Could not download image from {image_url}: {exc}")
        return self._create_fallback_image_bytes()

    def _create_fallback_image_bytes(self) -> bytes:
        img = Image.new("RGB", (1080, 1080), color=(245, 230, 210))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=1, min=2, max=6),
        retry=retry_if_exception(is_rate_limit_or_api_error),
        reraise=False,
    )
    def _generate_edited_image(self, pil_image: Image.Image, prompt: str) -> Optional[bytes]:
        """
        Send image + editing prompt to Gemini 2.5 Flash Image model and extract generated image bytes.
        """
        try:
            logger.info("[GeminiProvider] Sending request to Gemini 2.5 Flash Image model [gemini-2.5-flash-image]...")
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[pil_image, prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"]
                ),
            )

            if response and response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data and part.inline_data.data:
                        logger.info("[GeminiProvider] Gemini 2.5 Flash Image generation successful! Bytes received.")
                        return part.inline_data.data
                    elif hasattr(part, "text") and part.text:
                        logger.info(f"[GeminiProvider] Gemini response included text: {part.text[:200]}")

            logger.warning("[GeminiProvider] Gemini 2.5 Flash Image returned response without image bytes.")
        except Exception as exc:
            logger.error(f"[GeminiProvider] Gemini 2.5 Flash Image generation call failed: {exc}")
            raise exc
        return None

    def _apply_pillow_preset_enhancement(
        self, pil_image: Image.Image, preset_name: str
    ) -> bytes:
        """Pillow enhancement as a last-resort fallback when AI model is unavailable."""
        img = pil_image.copy().convert("RGB")

        presets_config = {
            "golden_hour": {"brightness": 1.08, "contrast": 1.25, "color": 1.20, "sharpness": 1.5, "warmth_r": 1.03, "warmth_b": 0.98},
            "rustic_cafe": {"brightness": 1.05, "contrast": 1.28, "color": 1.15, "sharpness": 1.4, "warmth_r": 1.02, "warmth_b": 0.99},
            "dark_moody": {"brightness": 0.92, "contrast": 1.40, "color": 1.10, "sharpness": 1.5, "warmth_r": 1.0, "warmth_b": 0.97},
            "clean_minimalist": {"brightness": 1.10, "contrast": 1.20, "color": 1.08, "sharpness": 1.4, "warmth_r": 1.01, "warmth_b": 1.0},
            "bright_airy": {"brightness": 1.15, "contrast": 1.15, "color": 1.12, "sharpness": 1.4, "warmth_r": 1.02, "warmth_b": 0.99},
        }
        preset_cfg = presets_config.get(preset_name, presets_config["golden_hour"])

        img = ImageEnhance.Contrast(img).enhance(preset_cfg["contrast"])
        img = ImageEnhance.Brightness(img).enhance(preset_cfg["brightness"])
        img = ImageEnhance.Color(img).enhance(preset_cfg["color"])
        img = ImageEnhance.Sharpness(img).enhance(preset_cfg["sharpness"])

        warm_r = preset_cfg.get("warmth_r", 1.02)
        warm_b = preset_cfg.get("warmth_b", 0.98)
        r, g, b = img.split()
        r = r.point(lambda i: min(255, int(i * warm_r)))
        b = b.point(lambda i: int(i * warm_b))
        img = Image.merge("RGB", (r, g, b))
        img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=140, threshold=2))

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=95)
        return buf.getvalue()

    async def enhance_image(
        self,
        image_url: str,
        preset_name: str = "golden_hour",
        custom_instruction: Optional[str] = None,
    ) -> bytes:
        """
        AI image enhancement via Gemini 2.5 Flash Image.
        1. Downloads input image.
        2. Constructs optimized prompt for Gemini 2.5 Flash Image.
        3. Calls gemini-2.5-flash-image to receive edited image bytes.
        4. Uses Pillow only as a last-resort fallback if AI calls fail.
        """
        raw_bytes = await self.fetch_image_bytes(image_url)
        resized_bytes = resize_and_pad_image(raw_bytes)

        try:
            pil_image = Image.open(io.BytesIO(resized_bytes)).convert("RGB")
        except Exception as exc:
            logger.error(f"[GeminiProvider] Failed to open input image: {exc}")
            pil_image = Image.open(io.BytesIO(self._create_fallback_image_bytes())).convert("RGB")

        if not self.client:
            logger.warning("[GeminiProvider] GEMINI_API_KEY missing. Falling back to Pillow enhancement as last resort.")
            return self._apply_pillow_preset_enhancement(pil_image, preset_name)

        # Build commercial photography prompt: Master Preset Prompt + Common Preservation Rules + User Custom Prompt
        prompt = build_image_prompt(
            preset_name=preset_name,
            custom_instruction=custom_instruction,
            product_name="food item",
            reference_image="the original image",
        )

        try:
            edited_bytes = self._generate_edited_image(pil_image, prompt)
            if edited_bytes:
                return edited_bytes
        except Exception as exc:
            logger.warning(f"[GeminiProvider] Gemini 2.5 Flash Image pipeline failed after retries: {exc}")

        logger.warning("[GeminiProvider] Gemini image generation unavailable or returned no image bytes. Falling back to Pillow smart enhancement as last resort.")
        return self._apply_pillow_preset_enhancement(pil_image, preset_name)
