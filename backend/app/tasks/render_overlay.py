"""
Render Overlay Task — DEPRECATED.

Text overlay rendering has been moved to Fabric.js (frontend).
This module is kept for backwards compatibility but no longer performs
Pillow-based text/logo rendering.

The overlay flow is now:
1. Backend: ImageDesignService generates design JSON
2. Frontend: Fabric.js renders text/logo/shapes on canvas
3. Frontend: Hidden Fabric.js canvas exports final JPEG
4. Frontend: Uploads JPEG to Cloudinary via /upload-edited-image
"""

from app.core.logging import logger


def render_overlay_task(*args, **kwargs):
    """Deprecated — overlay rendering is now handled by Fabric.js on the frontend."""
    logger.warning("[render_overlay_task] This task is deprecated. Use Fabric.js frontend rendering.")
    return None


async def _async_render_overlay(*args, **kwargs):
    """Deprecated — overlay rendering is now handled by Fabric.js on the frontend."""
    logger.warning("[_async_render_overlay] This task is deprecated. Use Fabric.js frontend rendering.")
    return None
