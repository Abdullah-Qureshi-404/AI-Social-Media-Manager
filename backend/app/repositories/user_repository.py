import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository handling User operations."""

    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Fetch user by unique email address."""
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_instagram_credentials(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        instagram_user_id: str,
        instagram_token: str,
        token_expires_at,
    ) -> Optional[User]:
        """Update Meta Instagram Business Account credentials for a tenant."""
        user = await self.get_by_id(db, user_id)
        if user:
            user.instagram_user_id = instagram_user_id
            user.instagram_token = instagram_token
            user.token_expires_at = token_expires_at
            await db.flush()
            await db.refresh(user)
        return user


user_repository = UserRepository()
