"""add dataset_ids to reports

Revision ID: zf7a8b9c0d1e
Revises: ze6f7a8b9c0d
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'zf7a8b9c0d1e'
down_revision = 'ze6f7a8b9c0d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('reports', sa.Column('dataset_ids', JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column('reports', 'dataset_ids')
