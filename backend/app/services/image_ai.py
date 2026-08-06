"""
Legacy / Backward Compatibility Alias for Image AI Service.
Delegates image enhancement operations to app.services.image_editing.image_editing_service
which supports multi-provider selection (Modal, Gemini, OpenAI, etc.).
"""

from app.services.image_editing import (
    image_editing_service,
    ImageEditingService,
    GeminiImageEditingProvider,
    ModalImageEditingProvider,
    OpenAIImageEditingProvider,
)

# Re-export active service instance and classes for backward compatibility
image_ai_service = image_editing_service
ImageAIService = ImageEditingService

__all__ = [
    "image_ai_service",
    "ImageAIService",
    "GeminiImageEditingProvider",
    "ModalImageEditingProvider",
    "OpenAIImageEditingProvider",
]