import re
import io
import json
import hashlib
import random
import httpx
from typing import Dict, Any, Optional, Tuple
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import logger


class ImageDesignService:
    """
    Zero-Thinking Smart Overlay Design Engine.

    Two-step architecture:
    Step 1: Image Composition Analysis (cached with SHA-256 hash validation)
    Step 2: Smart Design Generation (font, color, position, background, hierarchy)
    """

    DESIGN_VERSION = 1

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    async def get_or_analyze(
        self, post, image_url: str
    ) -> Tuple[dict, bytes]:
        """Cache-aware image composition analysis with SHA-256 hash validation."""
        image_bytes = await self._download_image(image_url)
        current_hash = self._compute_image_hash(image_bytes)

        cached = post.image_analysis_json
        if cached and isinstance(cached, dict):
            saved_hash = cached.get("image_hash", "")
            if saved_hash == current_hash:
                logger.info(f"[ImageDesignService] Cache hit for post {post.id}")
                return cached.get("analysis", self._get_fallback_analysis()), image_bytes

        logger.info(f"[ImageDesignService] Cache miss for post {post.id} — running Gemini analysis")
        analysis = await self.analyze_image_composition(image_bytes)

        post.image_analysis_json = {
            "version": self.DESIGN_VERSION,
            "analyzed_image_url": image_url,
            "image_hash": current_hash,
            "analysis": analysis,
        }

        return analysis, image_bytes

    async def analyze_image_composition(self, image_bytes: bytes) -> dict:
        """Step 1: Gemini image composition analysis."""
        fallback = self._get_fallback_analysis()
        if not self.client:
            return fallback

        try:
            from PIL import Image
            pil_image = Image.open(io.BytesIO(image_bytes))

            system_prompt = """You are an expert food photography art director.
Analyze this food/product image and return a composition analysis.

Determine:
1. Where is the main food/product positioned? (center, top, bottom, left, right, top_left, top_right, bottom_left, bottom_right)
2. What percentage of the image does the food/product occupy? (0-100)
3. Where are the empty/negative spaces suitable for text? (list of: top_left, top_center, top_right, center_left, center, center_right, bottom_left, bottom_center, bottom_right)
4. Background complexity? (low, medium, high)
5. Overall brightness? (dark, medium, bright)
6. What are the dominant colors? (list of hex codes, max 4)
7. Best area for text placement? (top_left, top_center, top_right, bottom_left, bottom_center, bottom_right)
8. Food/business style? (luxury, modern_cafe, bakery, minimal, casual, ethnic, health, dessert)

Return ONLY a JSON object:
{
  "product_position": "center",
  "food_area_percent": 60,
  "empty_spaces": ["top_left", "bottom_right"],
  "background_complexity": "high",
  "brightness": "dark",
  "dominant_colors": ["#8B4513", "#FFFFFF"],
  "recommended_text_area": "top_left",
  "food_style": "bakery"
}"""

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[system_prompt, pil_image],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )

            if response and response.text:
                resp_text = response.text.strip()
                resp_text = re.sub(r"```json|```", "", resp_text).strip()
                parsed = json.loads(resp_text)
                return {
                    "product_position": parsed.get("product_position", "center"),
                    "food_area_percent": parsed.get("food_area_percent", 60),
                    "empty_spaces": parsed.get("empty_spaces", ["bottom_center"]),
                    "background_complexity": parsed.get("background_complexity", "medium"),
                    "brightness": parsed.get("brightness", "medium"),
                    "dominant_colors": parsed.get("dominant_colors", ["#8B4513", "#FFFFFF"]),
                    "recommended_text_area": parsed.get("recommended_text_area", "bottom_center"),
                    "food_style": parsed.get("food_style", "casual"),
                }

        except Exception as exc:
            logger.warning(f"[ImageDesignService] Gemini analysis failed: {exc}")

        return fallback

    async def generate_overlay_design(
        self, analysis: dict, user_text: str, is_variation: bool = False
    ) -> dict:
        """
        Step 2: Generate overlay design JSON.
        If is_variation=True, forces Gemini to pick a fresh alternative font/position/style.
        """
        clean_text = (user_text or "").strip()
        if not clean_text:
            clean_text = "Daily Artisanal Special"

        fallback = self._get_fallback_design(analysis, clean_text, is_variation)

        if not self.client:
            return fallback

        try:
            variation_instruction = ""
            if is_variation:
                variation_instruction = "\nVARIATION REQUIREMENT: Generate an ALTERNATIVE layout style (try a different font, different position among empty spaces, and a different background panel type than default)."

            system_prompt = f"""You are a luxury Instagram food photography art director.

Given this image composition analysis:
{json.dumps(analysis, indent=2)}

User text: "{clean_text}"{variation_instruction}

Create a professional Instagram text overlay design spec.

DESIGN RULES:
- Fonts available: "Playfair Display", "Montserrat", "Dancing Script", "Raleway", "Lora", "Poppins"
- Dark image → light text (#FFFFFF, #FFF8E1)
- Bright image → dark text (#1a1a1a, #2d2d2d)
- Background types: "frosted_blur", "solid_dark", "shadow_only"
- Use percentage coordinates (0-100 for x_percent and y_percent) in empty space
- Split long text into headline (bold) + subtitle (normal)

Return ONLY a JSON object:
{{
  "version": 1,
  "lines": [
    {{"text": "Fresh Croissants", "font_size": 52, "font_weight": "bold"}},
    {{"text": "Daily Available 🥐", "font_size": 28, "font_weight": "normal"}}
  ],
  "position": {{
    "x_percent": 50,
    "y_percent": 80
  }},
  "font_family": "Playfair Display",
  "text_color": "#FFFFFF",
  "shadow": true,
  "background": {{
    "type": "frosted_blur",
    "opacity": 0.6,
    "blur": 15
  }},
  "alignment": "center",
  "line_spacing": 8,
  "padding": {{"horizontal": 30, "vertical": 20}}
}}"""

            temp = 0.7 if is_variation else 0.4
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[system_prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=temp,
                ),
            )

            if response and response.text:
                resp_text = response.text.strip()
                resp_text = re.sub(r"```json|```", "", resp_text).strip()
                parsed = json.loads(resp_text)
                return self._normalize_design(parsed, clean_text)

        except Exception as exc:
            logger.warning(f"[ImageDesignService] Design generation failed: {exc}")

        return fallback

    def _get_fallback_analysis(self) -> dict:
        return {
            "product_position": "center",
            "food_area_percent": 60,
            "empty_spaces": ["bottom_center", "top_center"],
            "background_complexity": "medium",
            "brightness": "medium",
            "dominant_colors": ["#8B4513", "#FFFFFF"],
            "recommended_text_area": "bottom_center",
            "food_style": "casual",
        }

    def _get_fallback_design(self, analysis: dict, text: str, is_variation: bool = False) -> dict:
        fonts = ["Playfair Display", "Montserrat", "Dancing Script", "Raleway", "Lora", "Poppins"]
        bg_types = ["frosted_blur", "solid_dark", "shadow_only"]
        positions = [
            {"x_percent": 50, "y_percent": 80},
            {"x_percent": 50, "y_percent": 18},
            {"x_percent": 20, "y_percent": 80},
        ]

        if is_variation:
            font_family = random.choice(fonts)
            bg_type = random.choice(bg_types)
            position = random.choice(positions)
        else:
            font_family = "Playfair Display"
            bg_type = "solid_dark"
            position = {"x_percent": 50, "y_percent": 80}

        return {
            "version": self.DESIGN_VERSION,
            "lines": self._split_text_into_lines(text),
            "position": position,
            "font_family": font_family,
            "text_color": "#FFFFFF",
            "shadow": True,
            "background": {"type": bg_type, "opacity": 0.55, "blur": 15},
            "alignment": "center",
            "line_spacing": 8,
            "padding": {"horizontal": 30, "vertical": 20},
        }

    def _split_text_into_lines(self, text: str) -> list:
        text = text.strip()
        for sep in ["•", "|", " - ", " / "]:
            if sep in text:
                parts = [p.strip() for p in text.split(sep, 1) if p.strip()]
                if len(parts) == 2:
                    return [
                        {"text": parts[0], "font_size": 48, "font_weight": "bold"},
                        {"text": parts[1], "font_size": 26, "font_weight": "normal"},
                    ]

        if len(text) <= 25:
            return [{"text": text, "font_size": 48, "font_weight": "bold"}]

        words = text.split()
        mid = len(words) // 2
        return [
            {"text": " ".join(words[:mid]), "font_size": 44, "font_weight": "bold"},
            {"text": " ".join(words[mid:]), "font_size": 26, "font_weight": "normal"},
        ]

    def _normalize_design(self, parsed: dict, original_text: str) -> dict:
        lines = parsed.get("lines", [])
        if not lines:
            lines = self._split_text_into_lines(original_text)

        position = parsed.get("position", {})
        if not isinstance(position, dict) or "x_percent" not in position:
            position = {"x_percent": 50, "y_percent": 80}

        background = parsed.get("background", {})
        if not isinstance(background, dict) or "type" not in background:
            background = {"type": "solid_dark", "opacity": 0.55, "blur": 0}

        padding = parsed.get("padding", {})
        if not isinstance(padding, dict):
            padding = {"horizontal": 30, "vertical": 20}

        return {
            "version": self.DESIGN_VERSION,
            "lines": [
                {
                    "text": line.get("text", ""),
                    "font_size": line.get("font_size", 42),
                    "font_weight": line.get("font_weight", "bold"),
                }
                for line in lines
                if line.get("text")
            ],
            "position": {
                "x_percent": max(5, min(95, position.get("x_percent", 50))),
                "y_percent": max(5, min(95, position.get("y_percent", 80))),
            },
            "font_family": parsed.get("font_family", "Playfair Display"),
            "text_color": parsed.get("text_color", "#FFFFFF"),
            "shadow": parsed.get("shadow", True),
            "background": {
                "type": background.get("type", "solid_dark"),
                "opacity": max(0, min(1, background.get("opacity", 0.55))),
                "blur": max(0, min(30, background.get("blur", 0))),
            },
            "alignment": parsed.get("alignment", "center"),
            "line_spacing": max(0, min(30, parsed.get("line_spacing", 8))),
            "padding": {
                "horizontal": max(10, min(60, padding.get("horizontal", 30))),
                "vertical": max(10, min(40, padding.get("vertical", 20))),
            },
        }

    async def _download_image(self, url: str) -> bytes:
        async with httpx.AsyncClient() as http_client:
            res = await http_client.get(url, timeout=15.0)
            res.raise_for_status()
            return res.content

    def _compute_image_hash(self, image_bytes: bytes) -> str:
        return f"sha256:{hashlib.sha256(image_bytes).hexdigest()}"


image_design_service = ImageDesignService()
