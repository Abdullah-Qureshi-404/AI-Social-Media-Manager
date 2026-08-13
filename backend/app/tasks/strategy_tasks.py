import uuid
import asyncio
from celery import shared_task
from app.core.database import AsyncSessionLocal
from app.services.strategy_engine import strategy_engine_service
from app.core.logging import logger

from typing import Optional

async def _async_generate_strategy(user_id_or_task, user_id_str: Optional[str] = None):
    raw_id = user_id_str if user_id_str else str(user_id_or_task)
    user_id = uuid.UUID(raw_id)
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Starting strategy generation for user {raw_id}")
            recommendations = await strategy_engine_service.generate_strategy(db, user_id)
            logger.info(f"Generated {len(recommendations)} recommendations for user {raw_id}")
        except Exception as e:
            logger.error(f"Error generating strategy for user {raw_id}: {e}")


@shared_task(name="app.tasks.strategy_tasks.generate_strategy_task")
def generate_strategy_task(user_id_str: str):
    """Celery task to run the Strategy Engine for a specific user."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        loop.create_task(_async_generate_strategy(user_id_str))
    else:
        loop.run_until_complete(_async_generate_strategy(user_id_str))


async def _async_generate_all_strategies():
    from sqlalchemy import select
    from app.models.user import User
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(User.id).where(User.is_active == True)
            user_ids = (await db.execute(stmt)).scalars().all()
            logger.info(f"Running daily strategy engine for {len(user_ids)} users...")
            for u_id in user_ids:
                try:
                    await strategy_engine_service.generate_strategy(db, u_id)
                except Exception as user_err:
                    logger.error(f"Error generating strategy for user {u_id}: {user_err}")
        except Exception as e:
            logger.error(f"Error in _async_generate_all_strategies: {e}")


@shared_task(name="app.tasks.strategy_tasks.run_all_strategy_generations_task")
def run_all_strategy_generations_task():
    """Celery Beat daily task to run the Strategy Engine for all active users."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        loop.create_task(_async_generate_all_strategies())
    else:
        loop.run_until_complete(_async_generate_all_strategies())
