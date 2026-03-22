"""add addon_row_packs to tenants

Revision ID: ff5g6h7i8j9k
Revises: zb2c3d4e5f6g
Create Date: 2026-03-22 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'ff5g6h7i8j9k'
down_revision = 'zb2c3d4e5f6g'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column('addon_row_packs', sa.Integer(), nullable=False, server_default='0',
                  comment='Packs de linhas extras (+100k linhas por dataset por pack)')
    )


def downgrade() -> None:
    op.drop_column('tenants', 'addon_row_packs')
