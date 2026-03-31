"""add whatsapp_button_clicks to short_links

Revision ID: ck3d4e5f6g7h
Revises: bj2c3d4e5f6g
Create Date: 2026-03-31

"""
from alembic import op
import sqlalchemy as sa

revision = 'ck3d4e5f6g7h'
down_revision = 'bj2c3d4e5f6g'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'short_links',
        sa.Column('whatsapp_button_clicks', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade():
    op.drop_column('short_links', 'whatsapp_button_clicks')
