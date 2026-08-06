"""Initial multi-tenant schema

Revision ID: 2026_08_03_0001
Revises: 
Create Date: 2026-08-03 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2026_08_03_0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Post Status Enum
    post_status_enum = postgresql.ENUM(
        'UPLOADED',
        'PROCESSING_IMAGE',
        'IMAGE_READY',
        'CAPTION_READY',
        'WAITING_APPROVAL',
        'APPROVED',
        'SCHEDULED',
        'POSTING',
        'PUBLISHED',
        'FAILED',
        'RETRYING',
        name='post_status_enum',
        create_type=False
    )
    post_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create Users Table (Tenant Root)
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=True),
        sa.Column('brand_voice', sa.String(length=50), server_default='friendly', nullable=False),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('instagram_user_id', sa.String(length=100), nullable=True),
        sa.Column('instagram_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 3. Create Posts Table (Tenant Scoped)
    op.create_table(
        'posts',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('status', post_status_enum, server_default='UPLOADED', nullable=False),
        sa.Column('original_image_url', sa.Text(), nullable=False),
        sa.Column('temp_image_url', sa.Text(), nullable=True),
        sa.Column('permanent_image_url', sa.Text(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('edit_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_edits_allowed', sa.Integer(), server_default='3', nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('instagram_media_id', sa.String(length=100), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_posts_user_id'), 'posts', ['user_id'], unique=False)
    op.create_index('idx_posts_user_tenant', 'posts', ['user_id', 'status'], unique=False)
    op.create_index('idx_posts_scheduled_due', 'posts', ['status', 'scheduled_at'], postgresql_where=sa.text('deleted_at IS NULL'))

    # 4. Create Post Image Versions Table (Edit History)
    op.create_table(
        'post_image_versions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('post_id', sa.UUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=False),
        sa.Column('prompt_used', sa.Text(), nullable=True),
        sa.Column('preset_style', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id', 'version_number', name='unique_post_version')
    )
    op.create_index(op.f('ix_post_image_versions_post_id'), 'post_image_versions', ['post_id'], unique=False)

    # 5. Create Tags Catalog Table
    op.create_table(
        'tags',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)

    # 6. Create Post Tags Junction Table
    op.create_table(
        'post_tags',
        sa.Column('post_id', sa.UUID(), nullable=False),
        sa.Column('tag_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('post_id', 'tag_id')
    )

    # 7. Create Analytics Table
    op.create_table(
        'analytics',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('post_id', sa.UUID(), nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('reach', sa.Integer(), server_default='0', nullable=False),
        sa.Column('saves', sa.Integer(), server_default='0', nullable=False),
        sa.Column('comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('engagement_rate', sa.Numeric(precision=5, scale=2), server_default='0.00', nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id')
    )

    # 8. Create Audit Logs Table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('post_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_post_id'), 'audit_logs', ['post_id'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('analytics')
    op.drop_table('post_tags')
    op.drop_table('tags')
    op.drop_table('post_image_versions')
    op.drop_table('posts')
    op.drop_table('users')
    
    post_status_enum = postgresql.ENUM(name='post_status_enum')
    post_status_enum.drop(op.get_bind(), checkfirst=True)
