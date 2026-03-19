"""add halp_usage_logs table for Halp chat rate limiting

Revision ID: y9z0a1b2c3d4
Revises: x8y9z0a1b2c3
Create Date: 2026-03-19

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'y9z0a1b2c3d4'
down_revision = 'x8y9z0a1b2c3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'halp_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_halp_usage_logs_tenant_id', 'halp_usage_logs', ['tenant_id'])
    op.create_index('ix_halp_usage_logs_created_at', 'halp_usage_logs', ['created_at'])


def downgrade():
    op.drop_index('ix_halp_usage_logs_created_at', table_name='halp_usage_logs')
    op.drop_index('ix_halp_usage_logs_tenant_id', table_name='halp_usage_logs')
    op.drop_table('halp_usage_logs')
