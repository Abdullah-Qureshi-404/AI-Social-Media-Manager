import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

# Cryptography context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash plain text password using Bcrypt (truncated to max 72 bytes for Bcrypt 4.x compat)."""
    safe_pass = password[:72]
    return pwd_context.hash(safe_pass)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored Bcrypt hash."""
    safe_pass = plain_password[:72]
    return pwd_context.verify(safe_pass, hashed_password)


def create_access_token(
    user_id: uuid.UUID, expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token expiring in 24 hours."""
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create JWT refresh token expiring in 7 days."""
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token payload."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None
