import uuid
from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.post import Post


class User(Base, TimestampMixin):
    """User Model representing a Cafe/Bakery Owner (Tenant Boundary)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    business_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    brand_voice: Mapped[str] = mapped_column(
        String(50),
        default="friendly",
        nullable=False,
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    instagram_user_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    instagram_token: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    posts: Mapped[List["Post"]] = relationship(
        "Post",
        back_populates="user",
        cascade="all, delete-orphan",
    )
