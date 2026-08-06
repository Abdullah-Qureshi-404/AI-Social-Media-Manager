import asyncio
import os
import dotenv

dotenv.load_dotenv()

from app.services.image_editing.openai_provider import OpenAIImageEditingProvider
from app.core.config import settings


async def test_openai_integration():
    print("==================================================")
    print("OpenAI Image Editing Provider Integration Test")
    print("==================================================")
    print(f"IMAGE_PROVIDER: {settings.IMAGE_PROVIDER}")
    print(f"OPENAI_IMAGE_MODEL: {settings.OPENAI_IMAGE_MODEL}")
    print(f"API Key Configured: {bool(settings.OPENAI_API_KEY)}")
    print("--------------------------------------------------")

    provider = OpenAIImageEditingProvider()

    input_img_path = "test.png"
    if not os.path.exists(input_img_path):
        raise FileNotFoundError(f"Input image '{input_img_path}' not found in backend directory.")

    abs_input_path = os.path.abspath(input_img_path)
    print(f"Enhancing input photo [{abs_input_path}] using OpenAI model [{provider.model_name}]...")

    # Direct call to enhance_image (raises exception on failure, no Pillow fallback)
    edited_bytes = await provider.enhance_image(
        image_url=f"file://{abs_input_path}",
        preset_name="golden_hour",
        custom_instruction="Transform this food photo into a warm golden hour cafe Instagram post."
    )

    output_filename = "openai_edited_output.png"
    with open(output_filename, "wb") as f:
        f.write(edited_bytes)

    print(f"SUCCESS: Enhanced image saved to {output_filename} (Size: {len(edited_bytes)} bytes)")


if __name__ == "__main__":
    asyncio.run(test_openai_integration())