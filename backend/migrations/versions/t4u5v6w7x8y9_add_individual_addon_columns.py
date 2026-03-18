"""add individual addon columns to tenants

Revision ID: t4u5v6w7x8y9
Revises: s3t4u5v6w7x8
Create Date: 2026-03-18

"""
from alembic import op
import sqlalchemy as sa

revision = 't4u5v6w7x8y9'
down_revision = 's3t4u5v6w7x8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column(
        'addon_dashboards', sa.Integer(), nullable=False, server_default='0',
        comment='Dashboards extras comprados via pack individual (+5 por pack)'
    ))
    op.add_column('tenants', sa.Column(
        'addon_datasets', sa.Integer(), nullable=False, server_default='0',
        comment='Datasets extras comprados via pack individual (+3 por pack)'
    ))


def downgrade() -> None:
    op.drop_column('tenants', 'addon_datasets')
    op.drop_column('tenants', 'addon_dashboards')
