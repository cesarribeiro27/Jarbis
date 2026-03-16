"""add cover_image to reports

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-03-16
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h2i3j4k5l6m7'
down_revision: Union[str, None] = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('reports', sa.Column('cover_image', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('reports', 'cover_image')
