from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.services.image_editing.base import BaseImageEditingProvider
from app.services.image_editing.gemini_provider import GeminiImageEditingProvider
from app.services.image_editing.modal_provider import ModalImageEditingProvider
from app.services.image_editing.openai_provider import OpenAIImageEditingProvider


class ImageEditingService:
    """
    Facade service that dynamically selects and delegates to the active Image Editing Provider
    (Modal, Gemini, OpenAI, etc.) based on application configuration (IMAGE_PROVIDER).
    """

    def __init__(self):
        self.provider_name = (settings.IMAGE_PROVIDER or "modal").lower().strip()
        self._provider: Optional[BaseImageEditingProvider] = None
        self._initialize_provider()

    def _initialize_provider(self):
        if self.provider_name == "modal":
            logger.info("[ImageEditingService] Initializing with MODAL GPU Provider.")
            self._provider = ModalImageEditingProvider()
        elif self.provider_name == "gemini":
            logger.info("[ImageEditingService] Initializing with GEMINI AI Provider.")
            self._provider = GeminiImageEditingProvider()
        elif self.provider_name == "openai":
            logger.info("[ImageEditingService] Initializing with OPENAI Provider.")
            self._provider = OpenAIImageEditingProvider()
        else:
            logger.warning(
                f"[ImageEditingService] Unknown provider '{self.provider_name}'. Defaulting to Modal GPU Provider."
            )
            self._provider = ModalImageEditingProvider()


    @property
    def provider(self) -> BaseImageEditingProvider:
        return self._provider

    async def enhance_image(
        self,
        image_url: str,
        preset_name: str = "golden_hour",
        custom_instruction: Optional[str] = None,
    ) -> bytes:
        """
        Delegates enhance_image to the active provider.
        """
        logger.info(f"[ImageEditing] Provider: {self.provider_name}")
        logger.info(f"[ImageEditingService] Enhancing image via active provider [{self.provider_name}]...")
        return await self._provider.enhance_image(
            image_url=image_url,
            preset_name=preset_name,
            custom_instruction=custom_instruction,
        )


image_editing_service = ImageEditingService()
