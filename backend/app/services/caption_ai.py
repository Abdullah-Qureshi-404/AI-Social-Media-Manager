import io
import json
import re
import httpx
from PIL import Image
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.core.config import settings
from app.core.logging import logger
from app.services.prompt_loader import prompt_loader


def is_rate_limit_or_api_error(exception: Exception) -> bool:
    err_str = str(exception).lower()
    return "429" in err_str or "rate limit" in err_str or "resource_exhausted" in err_str or "503" in err_str


class CaptionAIService:
    """Image-Aware Caption & Hashtag Generation Service."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(is_rate_limit_or_api_error),
        reraise=True,
    )
    def _call_gemini_caption(self, contents: list):
        """Internal retried method for caption generation."""
        logger.info("Generating captions from image context...")
        response = self.client.models.generate_content(
            model="gemini-3.6-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        if response and response.text:
            logger.info("Caption response received successfully.")
        return response

    async def generate_captions_and_hashtags(
        self,
        image_url: str,
        brand_voice: str = "friendly",
        user_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.client:
            logger.warning("GEMINI_API_KEY missing. Returning fallback captions.")
            return self._get_fallback_captions(user_instruction)

        try:
            image_bytes = None
            if image_url and not "mock.local" in image_url:
                try:
                    async with httpx.AsyncClient() as http_client:
                        res = await http_client.get(image_url, timeout=10.0)
                        if res.status_code == 200:
                            image_bytes = res.content
                except Exception as exc:
                    logger.warning(f"Could not download image for caption analysis: {exc}")

            system_prompt = f"""Look at the food item in this image.
Generate captions ONLY about what you actually see.
Do not mention croissants, espresso, or French baking unless those are visible in the image.
User instruction: {user_instruction or 'Highlight this food special'}
Brand voice: {brand_voice}

Generate exactly 12 hashtags for this specific food item.
Mix of: 3 specific food hashtags, 3 cafe/bakery hashtags, 3 lifestyle/mood hashtags, 3 Instagram food community hashtags. All must be relevant to what is in the image.

Return ONLY a JSON object:
{{
  "captions": [
    {{"id": 1, "tone": "Casual & Friendly", "text": "..."}},
    {{"id": 2, "tone": "Professional & Artisanal", "text": "..."}},
    {{"id": 3, "tone": "Engaging Call-to-Action", "text": "..."}}
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10", "#tag11", "#tag12"]
}}
Hashtags must match the actual food in the image.
Return ONLY the JSON."""

            contents = [system_prompt]
            if image_bytes:
                pil_image = Image.open(io.BytesIO(image_bytes))
                contents.append(pil_image)

            response = self._call_gemini_caption(contents)

            if response and response.text:
                text = response.text.strip()
                text = re.sub(r'```json|```', '', text).strip()
                parsed = json.loads(text)

                if "hashtags" in parsed and "suggested_hashtags" not in parsed:
                    parsed["suggested_hashtags"] = parsed["hashtags"]

                return parsed
            else:
                return self._get_fallback_captions(user_instruction)

        except Exception as e:
            logger.warning(f"Error in Gemini 3.6 Flash caption generation after retries: {e}. Falling back to default captions.")
            return self._get_fallback_captions(user_instruction)

    def _get_fallback_captions(self, user_instruction: Optional[str] = None) -> Dict[str, Any]:
        """Provide generic today's special captions when API is offline or fails."""
        extra_note = f" ({user_instruction})" if user_instruction else ""
        return {
            "captions": [
                {
                    "id": 1,
                    "tone": "Casual & Friendly",
                    "text": f"Fresh and delicious, made with love today 🍽️{extra_note}",
                },
                {
                    "id": 2,
                    "tone": "Professional & Artisanal",
                    "text": f"Quality ingredients, passionate preparation ✨{extra_note}",
                },
                {
                    "id": 3,
                    "tone": "Engaging Call-to-Action",
                    "text": f"Come taste the difference today! Tag someone who deserves a treat 👇{extra_note}",
                },
            ],
            "suggested_hashtags": [
                "#foodie",
                "#foodphotography",
                "#instafood",
                "#foodlover",
                "#delicious",
                "#homemade",
                "#freshfood",
                "#foodblogger",
                "#yummy",
                "#cafelife",
                "#foodstagram",
                "#tasty",
            ],
        }


caption_ai_service = CaptionAIService()
