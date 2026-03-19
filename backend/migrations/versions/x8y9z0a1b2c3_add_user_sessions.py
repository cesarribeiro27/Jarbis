"""add user_sessions table for health score and session tracking

Revision ID: x8y9z0a1b2c3
Revises: w7x8y9z0a1b2
Create Date: 2026-03-19

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = 'x8y9z0a1b2c3'
down_revision = 'w7x8y9z0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('ix_user_sessions_tenant_id', 'user_sessions', ['tenant_id'])
    op.create_index('ix_user_sessions_created_at', 'user_sessions', ['created_at'])


def downgrade():
    op.drop_index('ix_user_sessions_created_at', table_name='user_sessions')
    op.drop_index('ix_user_sessions_tenant_id', table_name='user_sessions')
    op.drop_index('ix_user_sessions_user_id', table_name='user_sessions')
    op.drop_table('user_sessions')
