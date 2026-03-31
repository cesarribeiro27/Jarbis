"""add totp fields to admin_users and users

Revision ID: bj2c3d4e5f6g
Revises: ai1b2c3d4e5f
Create Date: 2026-03-31

"""
from alembic import op
import sqlalchemy as sa

revision = 'bj2c3d4e5f6g'
down_revision = 'ai1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # admin_users: campos TOTP
    op.add_column('admin_users', sa.Column('totp_secret', sa.String(64), nullable=True))
    op.add_column('admin_users', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default='false'))
    # users (para o owner/admin principal que está em admin_emails_csv)
    op.add_column('users', sa.Column('totp_secret', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('admin_users', 'totp_secret')
    op.drop_column('admin_users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'totp_enabled')
