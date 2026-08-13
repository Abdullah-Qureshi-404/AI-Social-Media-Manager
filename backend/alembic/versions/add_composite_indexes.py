"""add composite indexes for performance

Revision ID: 2026_08_10_0005
Revises: d423591a297b
Create Date: 2026-08-10 17:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_10_0005'
down_revision: Union[str, None] = 'd423591a297b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite index on posts (user_id, status)
    op.create_index(
        'idx_posts_user_status',
        'posts',
        ['user_id', 'status'],
        unique=False,
        if_not_exists=True,
    )

    # 2. Composite index on menus (user_id, status)
    op.create_index(
        'idx_menus_user_status',
        'menus',
        ['user_id', 'status'],
        unique=False,
        if_not_exists=True,
    )

    # 3. Composite index on menu_items (user_id, is_active)
    op.create_index(
        'idx_menu_items_user_is_active',
        'menu_items',
        ['user_id', 'is_active'],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index('idx_menu_items_user_is_active', table_name='menu_items', if_exists=True)
    op.drop_index('idx_menus_user_status', table_name='menus', if_exists=True)
    op.drop_index('idx_posts_user_status', table_name='posts', if_exists=True)
