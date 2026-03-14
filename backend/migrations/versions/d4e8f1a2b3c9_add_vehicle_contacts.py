"""add_vehicle_contacts

Revision ID: d4e8f1a2b3c9
Revises: a3f91b2c4d7e
Create Date: 2026-03-10 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4e8f1a2b3c9'
down_revision: Union[str, None] = 'a3f91b2c4d7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vehicles', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('vehicles', sa.Column('email', sa.String(254), nullable=True))


def downgrade() -> None:
    op.drop_column('vehicles', 'email')
    op.drop_column('vehicles', 'phone')
