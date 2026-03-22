"""add billing_name to tenants

Revision ID: ab1c2d3e4f5g
Revises: za2b3c4d5e6f
Create Date: 2026-03-22 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'zb2c3d4e5f6g'
down_revision = 'ee4f5g6h7i8j'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column('billing_name', sa.String(200), nullable=True,
                  comment='Nome exibido nas faturas Stripe. Se vazio, usa o nome do tenant.')
    )


def downgrade() -> None:
    op.drop_column('tenants', 'billing_name')
