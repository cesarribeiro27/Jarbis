"""add report datasets

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = 'b2c3d4e5f6a7'
down_revision: str = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'report_datasets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('name', sa.String(300), nullable=False),
        sa.Column('type', sa.String(20), nullable=False, server_default='csv'),
        sa.Column('rows', JSONB, nullable=False, server_default='[]'),
        sa.Column('columns', JSONB, nullable=False, server_default='[]'),
        sa.Column('row_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('api_url', sa.String(2000), nullable=True),
        sa.Column('api_headers', JSONB, nullable=True),
        sa.Column('api_data_path', sa.String(200), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('report_datasets')
