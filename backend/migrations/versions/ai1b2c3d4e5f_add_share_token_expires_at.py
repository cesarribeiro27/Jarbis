"""add share_token_expires_at to reports

Revision ID: ai1b2c3d4e5f
Revises: zh9c0d1e2f3g
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'ai1b2c3d4e5f'
down_revision = 'zh9c0d1e2f3g'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('reports', sa.Column(
        'share_token_expires_at',
        sa.DateTime(timezone=True),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column('reports', 'share_token_expires_at')
