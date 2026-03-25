"""add GA fields to report_datasets

Revision ID: ze6f7a8b9c0d
Revises: zd5e6f7a8b9c
Create Date: 2026-03-25 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'ze6f7a8b9c0d'
down_revision = 'zd5e6f7a8b9c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('report_datasets', sa.Column('ga_property_id', sa.String(50), nullable=True))
    op.add_column('report_datasets', sa.Column('ga_credentials_enc', sa.String(4000), nullable=True))
    op.add_column('report_datasets', sa.Column('ga_dimensions', JSONB, nullable=True))
    op.add_column('report_datasets', sa.Column('ga_metrics', JSONB, nullable=True))
    op.add_column('report_datasets', sa.Column('ga_date_range_days', sa.Integer, nullable=True))


def downgrade() -> None:
    op.drop_column('report_datasets', 'ga_date_range_days')
    op.drop_column('report_datasets', 'ga_metrics')
    op.drop_column('report_datasets', 'ga_dimensions')
    op.drop_column('report_datasets', 'ga_credentials_enc')
    op.drop_column('report_datasets', 'ga_property_id')
