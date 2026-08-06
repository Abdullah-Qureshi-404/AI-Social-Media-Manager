"""
OverlayService — DEPRECATED for text/logo rendering.

Text overlay and watermark rendering has been moved to Fabric.js (frontend).
Fabric.js is now the single rendering engine for all visual overlays.

This module is kept for potential future server-side image processing needs
(e.g., batch export, API-only exports without a browser).
"""

from app.core.logging import logger


class OverlayService:
    """
    Deprecated Pillow Overlay Engine.
    All text, logo, and watermark rendering is now handled by Fabric.js on the frontend.
    """

    async def apply_overlay(self, **kwargs):
        """Deprecated — Fabric.js handles all overlay rendering."""
        logger.warning("[OverlayService] apply_overlay() is deprecated. Use Fabric.js frontend rendering.")
        return None


overlay_service = OverlayService()
