"""add notify_email and notify_slack_url to alerts

Revision ID: b2c3d4e5f6g7
Revises: za2b3c4d5e6f
Create Date: 2026-03-19 18:05:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6g7'
down_revision = 'za2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('report_alerts', sa.Column('notify_email', sa.String(500), nullable=True))
    op.add_column('report_alerts', sa.Column('notify_slack_url', sa.String(2000), nullable=True))


def downgrade():
    op.drop_column('report_alerts', 'notify_slack_url')
    op.drop_column('report_alerts', 'notify_email')
