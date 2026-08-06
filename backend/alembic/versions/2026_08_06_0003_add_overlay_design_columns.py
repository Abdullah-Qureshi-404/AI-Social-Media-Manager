"""Add smart overlay design columns to posts table

Revision ID: 2026_08_06_0003
Revises: 2026_08_04_0002
Create Date: 2026-08-06 18:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2026_08_06_0003'
down_revision: Union[str, None] = '2026_08_04_0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('image_analysis_json', sa.JSON(), nullable=True))
    op.add_column('posts', sa.Column('overlay_design_json', sa.JSON(), nullable=True))
    op.add_column('posts', sa.Column('fabric_canvas_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('posts', 'fabric_canvas_json')
    op.drop_column('posts', 'overlay_design_json')
    op.drop_column('posts', 'image_analysis_json')
