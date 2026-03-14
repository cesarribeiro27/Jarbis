"""add_report_alerts

Revision ID: c8f2a1e3b4d5
Revises: 37aa9154661c
Create Date: 2026-03-13 22:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'c8f2a1e3b4d5'
down_revision: Union[str, None] = '37aa9154661c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'report_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('report_datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('value_col', sa.String(200), nullable=False),
        sa.Column('agg', sa.String(20), nullable=False, server_default='sum'),
        sa.Column('operator', sa.String(10), nullable=False),
        sa.Column('threshold', sa.Float, nullable=False),
        sa.Column('filter_col', sa.String(200), nullable=True),
        sa.Column('filter_val', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('last_value', sa.Float, nullable=True),
        sa.Column('last_status', sa.String(20), nullable=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('report_alerts')
