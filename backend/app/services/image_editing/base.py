import abc
from typing import Optional


class BaseImageEditingProvider(abc.ABC):
    """
    Abstract Base Class interface for AI Image Editing Providers.
    Defines the contract for enhancing/editing social media product & food images.
    """

    @abc.abstractmethod
    async def enhance_image(
        self,
        image_url: str,
        preset_name: str = "golden_hour",
        custom_instruction: Optional[str] = None,
    ) -> bytes:
        """
        Enhance/edit an image using the provider's AI model.

        :param image_url: Public URL or accessible path to the source image.
        :param preset_name: Preset style name (e.g. 'golden_hour', 'rustic_cafe').
        :param custom_instruction: Optional user instruction for editing.
        :return: Enhanced image raw bytes (JPEG/PNG format).
        """
        pass
