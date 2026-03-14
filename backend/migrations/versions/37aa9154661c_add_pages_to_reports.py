"""add_pages_to_reports

Revision ID: 37aa9154661c
Revises: b2c3d4e5f6a7
Create Date: 2026-03-13 21:45:16.843819

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '37aa9154661c'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reports', sa.Column(
        'pages',
        postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default='[]',
    ))


def downgrade() -> None:
    op.drop_column('reports', 'pages')
