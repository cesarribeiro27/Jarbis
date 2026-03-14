"""add_email_verification_and_trial

Revision ID: e1f2a3b4c5d6
Revises: c8f2a1e3b4d5
Create Date: 2026-03-14 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'c8f2a1e3b4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tenant: trial
    op.add_column('tenants', sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True))

    # User: verificação de email
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('verification_code', sa.String(6), nullable=True))
    op.add_column('users', sa.Column('verification_code_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'verification_code_expires_at')
    op.drop_column('users', 'verification_code')
    op.drop_column('users', 'email_verified')
    op.drop_column('tenants', 'trial_ends_at')
