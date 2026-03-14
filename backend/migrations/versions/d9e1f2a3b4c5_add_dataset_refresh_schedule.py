"""add_dataset_refresh_schedule

Revision ID: d9e1f2a3b4c5
Revises: c8f2a1e3b4d5
Create Date: 2026-03-13 23:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'd9e1f2a3b4c5'
down_revision: Union[str, None] = 'c8f2a1e3b4d5'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('report_datasets', sa.Column('refresh_interval_minutes', sa.Integer(), nullable=True))
    op.add_column('report_datasets', sa.Column('next_refresh_at', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('report_datasets', 'next_refresh_at')
    op.drop_column('report_datasets', 'refresh_interval_minutes')
