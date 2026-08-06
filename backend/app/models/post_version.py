import uuid
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, UUID, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.post import Post


class PostImageVersion(Base, TimestampMixin):
    """Post Image Version Entity tracking AI edit history for undo/redo."""

    __tablename__ = "post_image_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    prompt_used: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    preset_style: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="versions")

    __table_args__ = (
        UniqueConstraint("post_id", "version_number", name="unique_post_version"),
    )
