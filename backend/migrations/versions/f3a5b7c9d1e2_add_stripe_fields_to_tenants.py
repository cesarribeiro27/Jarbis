"""add_stripe_fields_to_tenants

Revision ID: f3a5b7c9d1e2
Revises: e1f2a3b4c5d6
Create Date: 2026-03-14 18:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'f3a5b7c9d1e2'
down_revision: Union[str, None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('stripe_customer_id', sa.String(100), nullable=True, unique=True))
    op.add_column('tenants', sa.Column('stripe_subscription_id', sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('subscription_status', sa.String(20), nullable=False, server_default='active'))
    op.add_column('tenants', sa.Column('plan_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('tenants', 'plan_expires_at')
    op.drop_column('tenants', 'subscription_status')
    op.drop_column('tenants', 'stripe_subscription_id')
    op.drop_column('tenants', 'stripe_customer_id')
