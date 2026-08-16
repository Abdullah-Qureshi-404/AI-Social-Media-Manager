import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy import select, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.post import Post, PostStatusEnum
from app.models.post_version import PostImageVersion
from app.repositories.base_repository import BaseRepository


class PostRepository(BaseRepository[Post]):
    """Multi-Tenant Repository for Post lifecycle management."""

    def __init__(self):
        super().__init__(Post)

    async def get_post_with_versions(
        self, db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[Post]:
        """Fetch post by ID and tenant user_id, eager loading edit history versions."""
        stmt = (
            select(Post)
            .options(selectinload(Post.versions))
            .where(Post.id == post_id, Post.user_id == user_id, Post.deleted_at.is_(None))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_tenant_posts(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        status: Optional[PostStatusEnum] = None,
        page: int = 1,
        limit: int = 20,
    ) -> List[Post]:
        """Fetch paginated posts owned by a specific tenant with optional status filtering."""
        stmt = select(Post).where(Post.user_id == user_id, Post.deleted_at.is_(None))
        if status:
            stmt = stmt.where(Post.status == status)

        stmt = stmt.order_by(Post.created_at.desc()).offset((page - 1) * limit).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_max_version_number(self, db: AsyncSession, post_id: uuid.UUID) -> int:
        """Query maximum version number for a post from database to avoid duplicate key violations."""
        stmt = select(func.coalesce(func.max(PostImageVersion.version_number), 0)).where(
            PostImageVersion.post_id == post_id
        )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def add_image_version(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        version_number: int,
        image_url: str,
        prompt_used: Optional[str] = None,
        preset_style: Optional[str] = None,
    ) -> PostImageVersion:
        """Record a new photo enhancement version in the edit stack."""
        version = PostImageVersion(
            post_id=post_id,
            version_number=version_number,
            image_url=image_url,
            prompt_used=prompt_used,
            preset_style=preset_style,
        )
        db.add(version)
        await db.flush()
        await db.refresh(version)
        return version

    async def count_published_last_24h(self, db: AsyncSession, user_id: uuid.UUID) -> int:
        """Count number of posts published by tenant in the last 24 hours."""
        since = datetime.utcnow() - timedelta(hours=24)
        stmt = select(func.count(Post.id)).where(
            Post.user_id == user_id,
            Post.status == PostStatusEnum.PUBLISHED,
            Post.published_at >= since,
        )
        result = await db.execute(stmt)
        return result.scalar() or 0

    async def get_and_claim_due_posts(
        self, db: AsyncSession, limit: int = 10
    ) -> List[Post]:
        """
        Atomic claiming query preventing duplicate Instagram publishing race conditions.
        Uses PostgreSQL FOR UPDATE SKIP LOCKED to lock rows and immediately transitions
        status from 'SCHEDULED' to 'POSTING'.
        """
        now = datetime.utcnow()
        try:
            # 1. Select due posts and lock rows, skipping any locked by another worker
            stmt = (
                select(Post)
                .where(
                    Post.status == PostStatusEnum.SCHEDULED,
                    Post.scheduled_at <= now,
                    Post.deleted_at.is_(None),
                )
                .order_by(Post.scheduled_at.asc())
                .limit(limit)
                .with_for_update(skip_locked=True)
            )

            result = await db.execute(stmt)
            claimed_posts = list(result.scalars().all())

            if not claimed_posts:
                return []

            # 2. Atomically transition status of claimed posts to 'POSTING'
            for post in claimed_posts:
                post.status = PostStatusEnum.POSTING
                post.updated_at = now

            # 3. Commit claim immediately so row lock is released and status is committed
            await db.commit()
            return claimed_posts

        except Exception as e:
            await db.rollback()
            raise e


post_repository = PostRepository()
