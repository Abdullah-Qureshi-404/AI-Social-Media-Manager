"""Add current_edited_image_url column to posts table

Revision ID: 2026_08_04_0002
Revises: 2026_08_03_0001
Create Date: 2026-08-04 14:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_04_0002'
down_revision: Union[str, None] = '2026_08_03_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('current_edited_image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('posts', 'current_edited_image_url')
