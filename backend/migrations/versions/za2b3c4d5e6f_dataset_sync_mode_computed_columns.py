"""add sync_mode and computed_columns to datasets

Revision ID: za2b3c4d5e6f
Revises: z0a1b2c3d4e5
Create Date: 2026-03-19 18:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'za2b3c4d5e6f'
down_revision = 'z0a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('report_datasets', sa.Column('sync_mode', sa.String(20), nullable=False, server_default='replace'))
    op.add_column('report_datasets', sa.Column('computed_columns', postgresql.JSONB(), nullable=False, server_default='[]'))


def downgrade():
    op.drop_column('report_datasets', 'computed_columns')
    op.drop_column('report_datasets', 'sync_mode')
