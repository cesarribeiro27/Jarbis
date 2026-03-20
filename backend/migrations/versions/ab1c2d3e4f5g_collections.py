"""add collections and report_collections tables

Revision ID: ab1c2d3e4f5g
Revises: za2b3c4d5e6f
Create Date: 2026-03-20 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'ab1c2d3e4f5g'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('color', sa.String(20), nullable=True, server_default='#7c3aed'),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_collections_tenant_id', 'collections', ['tenant_id'])

    op.create_table(
        'report_collections',
        sa.Column('report_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('reports.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('collection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('collections.id', ondelete='CASCADE'), primary_key=True),
    )


def downgrade():
    op.drop_table('report_collections')
    op.drop_index('ix_collections_tenant_id', table_name='collections')
    op.drop_table('collections')
