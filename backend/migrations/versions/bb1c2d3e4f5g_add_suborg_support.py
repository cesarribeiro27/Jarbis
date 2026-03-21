"""Add sub-organization support to tenants

Revision ID: bb1c2d3e4f5g
Revises: za2b3c4d5e6f
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'bb1c2d3e4f5g'
down_revision = 'cd2e3f4g5h6i'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tenants', sa.Column(
        'parent_tenant_id',
        UUID(as_uuid=True),
        sa.ForeignKey('tenants.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.add_column('tenants', sa.Column(
        'is_suborg',
        sa.Boolean(),
        nullable=False,
        server_default='false',
    ))
    op.create_index('ix_tenants_parent_tenant_id', 'tenants', ['parent_tenant_id'])


def downgrade():
    op.drop_index('ix_tenants_parent_tenant_id', table_name='tenants')
    op.drop_column('tenants', 'is_suborg')
    op.drop_column('tenants', 'parent_tenant_id')
