"""add security_incidents table

Revision ID: ee4f5g6h7i8j
Revises: dd3e4f5g6h7i
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = 'ee4f5g6h7i8j'
down_revision = 'dd3e4f5g6h7i'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'security_incidents',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('endpoint', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('question_snippet', sa.Text(), nullable=True),
        sa.Column('pattern_matched', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_security_incidents_tenant_id', 'security_incidents', ['tenant_id'])
    op.create_index('ix_security_incidents_created_at', 'security_incidents', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_security_incidents_created_at', table_name='security_incidents')
    op.drop_index('ix_security_incidents_tenant_id', table_name='security_incidents')
    op.drop_table('security_incidents')
