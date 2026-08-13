import asyncio
from datetime import datetime, timedelta
from celery import shared_task
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.core.token_encryption import decrypt_token, encrypt_token
from app.models.user import User
from app.services.instagram_service import instagram_service


@shared_task(name="app.tasks.refresh_tokens.refresh_expiring_tokens_task")
def refresh_expiring_tokens_task():
    """
    Daily Celery Beat Task: Checks for Meta long-lived Instagram access tokens expiring
    within 10 days and refreshes them automatically.
    """
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_async_refresh_tokens())


async def _async_refresh_tokens():
    threshold_date = datetime.utcnow() + timedelta(days=10)

    async with AsyncSessionLocal() as db:
        stmt = select(User).where(
            User.instagram_token.isnot(None),
            User.token_expires_at <= threshold_date,
        )
        result = await db.execute(stmt)
        expiring_users = list(result.scalars().all())

        if not expiring_users:
            logger.info("No expiring Instagram access tokens found.")
            return 0

        logger.info(f"Found {len(expiring_users)} tenant access tokens near expiration")
        refreshed_count = 0

        for user in expiring_users:
            try:
                # Decrypt stored token before sending to Meta
                try:
                    plaintext_token = decrypt_token(user.instagram_token)
                except Exception:
                    logger.error(f"Token decryption failed for tenant {user.id} — skipping refresh")
                    continue

                if not plaintext_token:
                    logger.warning(f"Empty decrypted token for tenant {user.id} — skipping")
                    continue

                # Refresh token via Meta Graph API
                refresh_res = await instagram_service.refresh_long_lived_token(plaintext_token)
                new_plaintext_token = refresh_res["access_token"]

                # Re-encrypt the refreshed token before saving
                user.instagram_token = encrypt_token(new_plaintext_token)
                user.token_expires_at = refresh_res["expires_at"]
                refreshed_count += 1
                await db.commit()
                logger.info(f"Successfully refreshed Meta access token for tenant {user.id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Failed to refresh token for tenant {user.id}: {type(e).__name__}")

        return refreshed_count
