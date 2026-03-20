"""add db connector fields to report_datasets

Revision ID: e5f6g7h8i9j0
Revises: za2b3c4d5e6f
Create Date: 2026-03-20 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('report_datasets', sa.Column('db_type', sa.String(20), nullable=True))
    op.add_column('report_datasets', sa.Column('db_host', sa.String(255), nullable=True))
    op.add_column('report_datasets', sa.Column('db_port', sa.Integer(), nullable=True))
    op.add_column('report_datasets', sa.Column('db_name', sa.String(255), nullable=True))
    op.add_column('report_datasets', sa.Column('db_username', sa.String(255), nullable=True))
    op.add_column('report_datasets', sa.Column('db_password_enc', sa.String(1000), nullable=True))
    op.add_column('report_datasets', sa.Column('db_query', sa.Text(), nullable=True))


def downgrade():
    for col in ['db_query', 'db_password_enc', 'db_username', 'db_name', 'db_port', 'db_host', 'db_type']:
        op.drop_column('report_datasets', col)
