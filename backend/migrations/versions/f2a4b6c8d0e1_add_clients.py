"""add clients module

Revision ID: f2a4b6c8d0e1
Revises: e7c3a9f1b2d4
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'f2a4b6c8d0e1'
down_revision: str = 'e7c3a9f1b2d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'clients',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('nome', sa.String(300), nullable=False),
        sa.Column('nome_fantasia', sa.String(300), nullable=True),
        sa.Column('segmento', sa.String(100), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ATIVO'),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.add_column('media_plans', sa.Column('client_id', UUID(as_uuid=True), nullable=True))
    op.create_index('ix_media_plans_client_id', 'media_plans', ['client_id'])


def downgrade() -> None:
    op.drop_index('ix_media_plans_client_id', 'media_plans')
    op.drop_column('media_plans', 'client_id')
    op.drop_index('ix_clients_tenant_id', 'clients')
    op.drop_table('clients')
