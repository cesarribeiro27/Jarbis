"""add scheduled_reports table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-19 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'scheduled_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_name', sa.String(200), nullable=False),
        sa.Column('frequency', sa.String(20), nullable=False),
        sa.Column('emails', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('next_run', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_run', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_scheduled_reports_tenant_id', 'scheduled_reports', ['tenant_id'])
    op.create_index('ix_scheduled_reports_next_run', 'scheduled_reports', ['next_run'])


def downgrade():
    op.drop_index('ix_scheduled_reports_next_run', table_name='scheduled_reports')
    op.drop_index('ix_scheduled_reports_tenant_id', table_name='scheduled_reports')
    op.drop_table('scheduled_reports')
