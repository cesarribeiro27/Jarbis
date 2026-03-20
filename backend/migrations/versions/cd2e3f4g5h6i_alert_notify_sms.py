"""add notify_sms to report_alerts

Revision ID: cd2e3f4g5h6i
Revises: bc1d2e3f4g5h
Create Date: 2026-03-20 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'cd2e3f4g5h6i'
down_revision = 'bc1d2e3f4g5h'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('report_alerts', sa.Column('notify_sms', sa.String(500), nullable=True))

def downgrade():
    op.drop_column('report_alerts', 'notify_sms')
