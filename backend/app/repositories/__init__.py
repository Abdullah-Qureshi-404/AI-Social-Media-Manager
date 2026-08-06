from app.repositories.base_repository import BaseRepository
from app.repositories.user_repository import user_repository, UserRepository
from app.repositories.post_repository import post_repository, PostRepository

__all__ = [
    "BaseRepository",
    "user_repository",
    "UserRepository",
    "post_repository",
    "PostRepository",
]
