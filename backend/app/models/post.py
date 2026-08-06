import enum
import uuid
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, UUID, ForeignKey, Enum as SQLEnum, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.post_version import PostImageVersion
    from app.models.analytics import Analytics


class PostStatusEnum(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING_IMAGE = "PROCESSING_IMAGE"
    IMAGE_READY = "IMAGE_READY"
    CAPTION_READY = "CAPTION_READY"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    POSTING = "POSTING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class Post(Base, TimestampMixin):
    """Post Entity representing a Social Media Post (Tenant Scoped)."""

    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[PostStatusEnum] = mapped_column(
        SQLEnum(PostStatusEnum, name="post_status_enum"),
        default=PostStatusEnum.UPLOADED,
        nullable=False,
    )
    original_image_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    temp_image_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    current_edited_image_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    permanent_image_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    caption: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    edit_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    max_edits_allowed: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    instagram_media_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Smart Overlay Design System (Zero-Thinking Overlay)
    image_analysis_json: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, doc="Cached Gemini image composition analysis with SHA-256 hash"
    )
    overlay_design_json: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, doc="AI-generated overlay design (font, position, color, background)"
    )
    fabric_canvas_json: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, doc="Full Fabric.js canvas state after manual editing"
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="posts")
    versions: Mapped[List["PostImageVersion"]] = relationship(
        "PostImageVersion",
        back_populates="post",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    analytics: Mapped[Optional["Analytics"]] = relationship(
        "Analytics",
        back_populates="post",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_posts_user_tenant", "user_id", "status"),
        Index("idx_posts_scheduled_due", "status", "scheduled_at", postgresql_where=(deleted_at == None)),
    )
