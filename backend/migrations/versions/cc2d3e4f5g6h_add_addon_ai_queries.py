"""add addon_ai_queries to tenants

Revision ID: cc2d3e4f5g6h
Revises: bb1c2d3e4f5g
Create Date: 2026-03-21 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cc2d3e4f5g6h'
down_revision = 'bb1c2d3e4f5g'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column(
            'addon_ai_queries',
            sa.Integer(),
            nullable=False,
            server_default='0',
            comment='Packs de IA ativos (+50 perguntas/mês por pack)',
        ),
    )


def downgrade() -> None:
    op.drop_column('tenants', 'addon_ai_queries')
