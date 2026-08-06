import uuid
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Integer, Numeric, DateTime, UUID, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.post import Post


class Analytics(Base):
    """Post Performance Analytics Entity (Meta Graph API metrics)."""

    __tablename__ = "analytics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    likes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    reach: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    saves: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    comments: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    engagement_rate: Mapped[float] = mapped_column(
        Numeric(5, 2),
        default=0.00,
        nullable=False,
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="analytics")
