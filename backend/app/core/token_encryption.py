"""
Centralized Fernet (AES-128-CBC + HMAC-SHA256) encryption for sensitive credentials
stored in the database — primarily Instagram access tokens.

Usage
-----
    from app.core.token_encryption import encrypt_token, decrypt_token

    encrypted = encrypt_token(raw_access_token)   # store this in DB
    raw       = decrypt_token(encrypted)           # use this for API calls

Key Management
--------------
The encryption key is loaded from settings.FERNET_SECRET_KEY.

Generate a new key:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Store the result in your .env / secrets manager as FERNET_SECRET_KEY.

If FERNET_SECRET_KEY is not configured (empty string), both functions fall through
transparently so that development environments without the key still work.
A warning is emitted on every call so you know encryption is inactive.

IMPORTANT: Never log the key, the plaintext token, or the ciphertext unless
debugging is explicitly enabled and logs are not shipped to an external service.
"""
from __future__ import annotations

from typing import Optional

from app.core.logging import logger


def _get_fernet():
    """Lazy-load and cache a Fernet instance from settings."""
    from app.core.config import settings  # local import avoids circular import at module load
    if not settings.FERNET_SECRET_KEY:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(settings.FERNET_SECRET_KEY.encode())
    except Exception as exc:
        logger.error(f"Invalid FERNET_SECRET_KEY — token encryption disabled: {exc}")
        return None


def encrypt_token(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypt a plaintext access token for storage.

    Returns the ciphertext as a UTF-8 string, or the original value unchanged
    if encryption is not configured (with a warning).
    """
    if not plaintext:
        return plaintext
    f = _get_fernet()
    if f is None:
        logger.warning(
            "FERNET_SECRET_KEY not set — Instagram access token stored in plaintext. "
            "Set FERNET_SECRET_KEY in your environment before production deployment."
        )
        return plaintext
    try:
        return f.encrypt(plaintext.encode()).decode()
    except Exception as exc:
        logger.error(f"Token encryption failed: {exc}")
        raise


def decrypt_token(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypt a ciphertext token retrieved from the database.

    Returns the plaintext, or the original value unchanged if encryption is
    not configured.  Raises ValueError on decryption failure so callers can
    handle a corrupted or key-rotated token gracefully.
    """
    if not ciphertext:
        return ciphertext
    f = _get_fernet()
    if f is None:
        logger.warning(
            "FERNET_SECRET_KEY not set — returning token as-is (may already be plaintext)."
        )
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception as exc:
        raise ValueError(f"Token decryption failed (key mismatch or corrupted data): {exc}") from exc
