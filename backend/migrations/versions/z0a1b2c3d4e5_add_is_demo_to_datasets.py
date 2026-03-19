"""add is_demo column to report_datasets

Revision ID: z0a1b2c3d4e5
Revises: y9z0a1b2c3d4
Create Date: 2026-03-19

"""
import sqlalchemy as sa
from alembic import op

revision = 'z0a1b2c3d4e5'
down_revision = 'y9z0a1b2c3d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'report_datasets',
        sa.Column('is_demo', sa.Boolean(), nullable=False, server_default='false'),
    )


def downgrade() -> None:
    op.drop_column('report_datasets', 'is_demo')
