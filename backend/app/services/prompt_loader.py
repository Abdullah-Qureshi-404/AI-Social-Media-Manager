from typing import Optional
from app.services.image_editing.prompt_builder import build_image_prompt, PRESET_PROMPTS


class PromptLoader:
    """Service for retrieving hardcoded commercial photography prompt templates."""

    def get_image_prompt(
        self,
        preset_name: str,
        custom_instruction: Optional[str] = None,
        product_name: str = "food item",
        reference_image: str = "the original image",
    ) -> str:
        """
        Build master preset prompt + preservation rules + optional custom instruction.
        """
        return build_image_prompt(
            preset_name=preset_name,
            custom_instruction=custom_instruction,
            product_name=product_name,
            reference_image=reference_image,
        )

    def get_caption_prompt(self, brand_voice: str) -> str:
        """Fallback caption prompt helper."""
        return f"Generate a {brand_voice} Instagram caption and hashtags for the food item in this image."


prompt_loader = PromptLoader()
