"""add links_campaign fields to report_datasets

Revision ID: zh9c0d1e2f3g
Revises: zf7a8b9c0d1e
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'zh9c0d1e2f3g'
down_revision = 'ag1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('report_datasets', sa.Column('links_campaign_id', sa.String(36), nullable=True))
    op.add_column('report_datasets', sa.Column('links_days', sa.Integer, nullable=True))


def downgrade() -> None:
    op.drop_column('report_datasets', 'links_days')
    op.drop_column('report_datasets', 'links_campaign_id')
