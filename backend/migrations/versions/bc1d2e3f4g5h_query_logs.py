"""add query_logs table

Revision ID: bc1d2e3f4g5h
Revises: ab1c2d3e4f5g
Create Date: 2026-03-20 13:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'bc1d2e3f4g5h'
down_revision = 'ab1c2d3e4f5g'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'query_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('dataset_name', sa.String(200), nullable=True),
        sa.Column('query_type', sa.String(50), nullable=False),  # api_sync, db_query, csv_load
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('rows_returned', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ok'),  # ok | error
        sa.Column('error_msg', sa.Text(), nullable=True),
        sa.Column('cached', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_query_logs_tenant_id', 'query_logs', ['tenant_id'])
    op.create_index('ix_query_logs_created_at', 'query_logs', ['created_at'])

def downgrade():
    op.drop_index('ix_query_logs_created_at', table_name='query_logs')
    op.drop_index('ix_query_logs_tenant_id', table_name='query_logs')
    op.drop_table('query_logs')
