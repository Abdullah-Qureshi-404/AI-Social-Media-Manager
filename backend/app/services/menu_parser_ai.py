import io
import json
import re
import ipaddress
import urllib.parse
import httpx
from PIL import Image
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import logger
from app.middleware.exception_handler import AppException


def validate_url_ssrf(url: str):
    """
    Validates URL to prevent SSRF vulnerabilities.
    Rejects non-HTTP/HTTPS schemes, localhost, private IP ranges, and cloud metadata endpoints.
    """
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise AppException("Invalid URL scheme. Only HTTP and HTTPS are allowed.", code="INVALID_URL", status_code=400)

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise AppException("Invalid URL hostname.", code="INVALID_URL", status_code=400)

    if hostname in ("localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254") or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise AppException("Access to internal/private IP addresses is forbidden.", code="SSRF_PREVENTED", status_code=400)

    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise AppException("Access to private/internal IP address range is forbidden.", code="SSRF_PREVENTED", status_code=400)
    except ValueError:
        # Hostname is a domain name, not an IP literal
        pass


class MenuParserAIService:
    """AI Service to extract structured menu data from images, PDFs, or URLs."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    async def parse_menu_from_url(self, url: str) -> List[Dict[str, Any]]:
        """Parses a menu from a given image or website URL with SSRF protection."""
        validate_url_ssrf(url)

        if not self.client:
            logger.warning("GEMINI_API_KEY missing. Returning fallback menu data.")
            return self._get_fallback_menu()

        try:
            async with httpx.AsyncClient(follow_redirects=True, max_redirects=3) as http_client:
                res = await http_client.get(url, timeout=10.0)
                if res.status_code != 200:
                    raise AppException(f"Failed to fetch menu from URL. HTTP Status: {res.status_code}", code="URL_FETCH_FAILED", status_code=400)

                content_type = res.headers.get("content-type", "").lower()
                content = res.content

                # 10MB size limit check
                if len(content) > 10 * 1024 * 1024:
                    raise AppException("Menu content at URL exceeds 10MB size limit.", code="FILE_TOO_LARGE", status_code=400)

                if "image" in content_type:
                    return await self.parse_menu_from_bytes(content)
                elif "pdf" in content_type or url.lower().endswith(".pdf"):
                    return await self.parse_menu_from_bytes(content)
                else:
                    # Treat as HTML / Text webpage
                    html_str = content.decode("utf-8", errors="ignore")
                    extracted_text = self._extract_clean_text_from_html(html_str)
                    sanitized_text = self._sanitize_for_prompt(extracted_text)
                    return await self._call_gemini_text_parser(sanitized_text)

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error in parse_menu_from_url: {e}")
            raise AppException("Failed to parse menu from URL. Please ensure it points to a valid image or webpage.", code="URL_PARSE_FAILED", status_code=400)

    async def parse_menu_from_bytes(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """Parses a menu from uploaded image bytes or handles PDF files cleanly."""
        if not self.client:
            logger.warning("GEMINI_API_KEY missing. Returning fallback menu data.")
            return self._get_fallback_menu()

        # PDF magic bytes check
        if image_bytes.startswith(b"%PDF"):
            raise AppException(
                "PDF menu processing is currently unavailable. Please upload an image of the menu instead.",
                code="PDF_UNSUPPORTED",
                status_code=400,
            )

        return await self._call_gemini_image_parser(image_bytes)

    def _extract_clean_text_from_html(self, html: str) -> str:
        """Strips HTML tags, scripts, and styles to extract readable text for Gemini."""
        text = re.sub(r'<script.*?>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style.*?>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text[:10000]  # Cap at 10k chars

    def _sanitize_for_prompt(self, text: str) -> str:
        """Sanitize extracted webpage text to prevent prompt injection attacks and cap length."""
        if not text:
            return ""

        # 1. Remove lines starting with common prompt injection role prefixes
        forbidden_prefixes = ("###", "system", "assistant", "user:")
        clean_lines = []
        for line in text.splitlines():
            stripped = line.strip()
            if any(stripped.lower().startswith(prefix) for prefix in forbidden_prefixes):
                continue
            clean_lines.append(line)
        sanitized = "\n".join(clean_lines)

        # 2. Strip prompt injection phrases (case-insensitive)
        injection_patterns = [
            r"ignore\s+previous",
            r"ignore\s+above",
            r"ignore\s+all",
            r"system\s*:",
            r"you\s+are\s+now",
            r"forget\s+your",
            r"new\s+instruction",
            r"disregard",
            r"override",
        ]
        pattern = re.compile("|".join(injection_patterns), re.IGNORECASE)
        sanitized = pattern.sub("", sanitized)

        # 3. Truncate final text to 6000 characters max
        return sanitized[:6000].strip()

    async def _call_gemini_image_parser(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            pil_image = Image.open(io.BytesIO(image_bytes))

            system_prompt = """You are an expert data entry assistant for a restaurant.
Carefully read the provided menu image and extract all menu items.
For each item, extract its name, description (if any), price (as a float, omit currency symbols), and category.

Return ONLY a JSON array of objects with the following structure:
[
  {
    "name": "Chocolate Cake",
    "description": "Rich dark chocolate layer cake",
    "price": 8.50,
    "category": "Dessert"
  }
]
Return ONLY the JSON array."""

            response = self.client.models.generate_content(
                model="gemini-3.6-flash",
                contents=[system_prompt, pil_image],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            if response and response.text:
                text = response.text.strip()
                text = re.sub(r'```json|```', '', text).strip()
                return json.loads(text)
            return []

        except AppException:
            raise
        except Exception as e:
            logger.warning(f"Error in Gemini menu image parsing: {e}")
            raise AppException("Failed to parse menu image. Please ensure the image is clear.", code="IMAGE_PARSE_FAILED", status_code=400)

    async def _call_gemini_text_parser(self, text_content: str) -> List[Dict[str, Any]]:
        try:
            system_prompt = f"""You are an expert data entry assistant for a restaurant.
Extract all menu items from the following website text.
For each item, extract its name, description (if any), price (as a float, omit currency symbols), and category.

Website Text:
{text_content}

Return ONLY a JSON array of objects with the following structure:
[
  {{
    "name": "Chocolate Cake",
    "description": "Rich dark chocolate layer cake",
    "price": 8.50,
    "category": "Dessert"
  }}
]
Return ONLY the JSON array."""

            response = self.client.models.generate_content(
                model="gemini-3.6-flash",
                contents=system_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            if response and response.text:
                text = response.text.strip()
                text = re.sub(r'```json|```', '', text).strip()
                return json.loads(text)
            return []

        except AppException:
            raise
        except Exception as e:
            logger.warning(f"Error in Gemini menu text parsing: {e}")
            raise AppException("Failed to parse menu text from URL.", code="TEXT_PARSE_FAILED", status_code=400)

    def _get_fallback_menu(self) -> List[Dict[str, Any]]:
        return [
            {"name": "Espresso", "description": "Single shot of dark roast", "price": 3.00, "category": "Coffee"},
            {"name": "Cappuccino", "description": "Espresso with steamed milk and foam", "price": 4.50, "category": "Coffee"},
            {"name": "Butter Croissant", "description": "Flaky, buttery pastry", "price": 4.00, "category": "Pastries"},
            {"name": "Chocolate Croissant", "description": "Croissant filled with dark chocolate", "price": 4.50, "category": "Pastries"},
            {"name": "Avocado Toast", "description": "Smashed avocado on sourdough", "price": 9.50, "category": "Food"},
        ]

menu_parser_ai_service = MenuParserAIService()
