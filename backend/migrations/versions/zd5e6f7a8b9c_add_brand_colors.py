"""add brand_colors to tenants

Revision ID: zd5e6f7a8b9c
Revises: zc4d5e6f7a8b
Create Date: 2026-03-23 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'zd5e6f7a8b9c'
down_revision = 'zc4d5e6f7a8b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column(
        'brand_colors', sa.Text(), nullable=True,
        comment='Paleta da marca — JSON array de até 5 hex strings'
    ))


def downgrade() -> None:
    op.drop_column('tenants', 'brand_colors')
