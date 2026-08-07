"""Add tenant profile and Instagram metadata columns to users table

Revision ID: 2026_08_07_0004
Revises: 2026_08_06_0003
Create Date: 2026-08-07 11:24:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_07_0004'
down_revision: Union[str, None] = '2026_08_06_0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('plan', sa.String(50), server_default='Pro SaaS', nullable=False))
    op.add_column('users', sa.Column('instagram_username', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('instagram_business_name', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('instagram_profile_picture', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('instagram_followers_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('instagram_following_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('instagram_posts_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('instagram_category', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('instagram_connected_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('instagram_last_sync', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'instagram_last_sync')
    op.drop_column('users', 'instagram_connected_at')
    op.drop_column('users', 'instagram_category')
    op.drop_column('users', 'instagram_posts_count')
    op.drop_column('users', 'instagram_following_count')
    op.drop_column('users', 'instagram_followers_count')
    op.drop_column('users', 'instagram_profile_picture')
    op.drop_column('users', 'instagram_business_name')
    op.drop_column('users', 'instagram_username')
    op.drop_column('users', 'plan')
