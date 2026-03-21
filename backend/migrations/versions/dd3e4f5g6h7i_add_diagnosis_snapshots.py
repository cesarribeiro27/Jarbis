"""add diagnosis_snapshots table

Revision ID: dd3e4f5g6h7i
Revises: cc2d3e4f5g6h
Create Date: 2026-03-21
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = 'dd3e4f5g6h7i'
down_revision = 'cc2d3e4f5g6h'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'diagnosis_snapshots',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('report_id', UUID(as_uuid=True), sa.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('health_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('domain', sa.String(64), nullable=False, server_default='generic'),
        sa.Column('domain_name', sa.String(128), nullable=False, server_default='Genérico'),
        sa.Column('visual_insights', JSONB, nullable=False, server_default='[]'),
        sa.Column('missing_blocks', JSONB, nullable=False, server_default='[]'),
        sa.Column('missing_columns', JSONB, nullable=False, server_default='[]'),
        sa.Column('suggestions', JSONB, nullable=False, server_default='[]'),
    )
    op.create_index('ix_diagnosis_snapshots_report_id', 'diagnosis_snapshots', ['report_id'])
    op.create_index('ix_diagnosis_snapshots_tenant_id', 'diagnosis_snapshots', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_diagnosis_snapshots_tenant_id', table_name='diagnosis_snapshots')
    op.drop_index('ix_diagnosis_snapshots_report_id', table_name='diagnosis_snapshots')
    op.drop_table('diagnosis_snapshots')
