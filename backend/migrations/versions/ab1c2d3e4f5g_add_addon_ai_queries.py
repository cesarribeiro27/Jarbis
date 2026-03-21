"""add addon_ai_queries to tenants

Revision ID: ab1c2d3e4f5g
Revises: za2b3c4d5e6f
Create Date: 2026-03-21 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ab1c2d3e4f5g'
down_revision = 'za2b3c4d5e6f'
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
