import io
from PIL import Image, ImageOps

from app.constants import TARGET_IMAGE_DIMENSION


def resize_and_pad_image(
    image_bytes: bytes, target_size: int = TARGET_IMAGE_DIMENSION
) -> bytes:
    """
    Center-crop fill raw uploaded image to target 1080x1080 square format using ImageOps.fit.
    Fills entire square container with zero white letterbox borders.
    """
    image = Image.open(io.BytesIO(image_bytes))

    # Convert RGBA / P modes to RGB for JPEG compatibility
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    # Crop-fill to exact 1080x1080 square without letterbox
    fitted_image = ImageOps.fit(
        image,
        (target_size, target_size),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )

    output = io.BytesIO()
    fitted_image.save(output, format="JPEG", quality=92, optimize=True)
    return output.getvalue()
