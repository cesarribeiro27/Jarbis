"""add addon_packs to tenants

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-03-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column(
            'addon_packs',
            sa.Integer(),
            nullable=False,
            server_default='0',
            comment='Número de packs de expansão ativos (+1 user +5 dash +3 datasets por pack)',
        ),
    )


def downgrade() -> None:
    op.drop_column('tenants', 'addon_packs')
