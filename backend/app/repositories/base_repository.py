import uuid
from typing import Generic, TypeVar, Type, Optional, List, Any, Dict
from sqlalchemy import select, update, func, Column
from sqlalchemy.sql import Select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Production-Grade Multi-Tenant Base Repository.
    Guarantees strict tenant data isolation (user_id filtering) across all queries.
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    def _apply_tenant_filter(
        self, stmt: Select, user_id: Optional[uuid.UUID]
    ) -> Select:
        """Helper to apply user_id tenant filtering and soft-delete filtering if present."""
        if user_id is not None and hasattr(self.model, "user_id"):
            stmt = stmt.where(getattr(self.model, "user_id") == user_id)

        if hasattr(self.model, "deleted_at"):
            stmt = stmt.where(getattr(self.model, "deleted_at").is_(None))

        return stmt

    async def get_by_id(
        self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> Optional[ModelType]:
        """Fetch entity by ID with tenant isolation and soft-delete check."""
        stmt = select(self.model).where(self.model.id == id)
        stmt = self._apply_tenant_filter(stmt, user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        db: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ModelType]:
        """Fetch paginated entities scoped strictly to the current tenant."""
        stmt = select(self.model)
        stmt = self._apply_tenant_filter(stmt, user_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self, db: AsyncSession, user_id: Optional[uuid.UUID] = None
    ) -> int:
        """Count total active records owned by the tenant."""
        stmt = select(func.count()).select_from(self.model)
        if user_id is not None and hasattr(self.model, "user_id"):
            stmt = stmt.where(getattr(self.model, "user_id") == user_id)
        if hasattr(self.model, "deleted_at"):
            stmt = stmt.where(getattr(self.model, "deleted_at").is_(None))

        result = await db.execute(stmt)
        return result.scalar_one() or 0

    async def create(
        self, db: AsyncSession, user_id: Optional[uuid.UUID] = None, **kwargs: Any
    ) -> ModelType:
        """
        Create entity, ensuring user_id is attached if the model is tenant-scoped.
        """
        if user_id is not None and hasattr(self.model, "user_id"):
            kwargs["user_id"] = user_id

        instance = self.model(**kwargs)
        db.add(instance)
        await db.flush()
        await db.refresh(instance)
        return instance

    async def update(
        self,
        db: AsyncSession,
        id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None,
        **kwargs: Any,
    ) -> Optional[ModelType]:
        """
        Update entity with strict tenant filtering and timestamp update.
        """
        stmt = select(self.model).where(self.model.id == id)
        stmt = self._apply_tenant_filter(stmt, user_id)
        result = await db.execute(stmt)
        instance = result.scalar_one_or_none()

        if not instance:
            return None

        for key, value in kwargs.items():
            if hasattr(instance, key) and key not in ("id", "created_at"):
                setattr(instance, key, value)

        if hasattr(instance, "updated_at"):
            setattr(instance, "updated_at", func.now())

        await db.flush()
        await db.refresh(instance)
        return instance

    async def delete(
        self, db: AsyncSession, id: uuid.UUID, user_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Soft delete (or hard delete if soft delete not supported) with tenant isolation.
        """
        instance = await self.get_by_id(db, id, user_id)
        if not instance:
            return False

        if hasattr(instance, "deleted_at"):
            setattr(instance, "deleted_at", func.now())
            await db.flush()
        else:
            await db.delete(instance)
            await db.flush()

        return True
