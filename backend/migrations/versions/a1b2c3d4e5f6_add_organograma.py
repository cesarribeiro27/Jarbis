"""add organograma module

Revision ID: a1b2c3d4e5f6
Revises: f2a4b6c8d0e1
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'a1b2c3d4e5f6'
down_revision: str = 'f2a4b6c8d0e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'org_members',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('nome', sa.String(200), nullable=False),
        sa.Column('cargo', sa.String(100), nullable=False),
        sa.Column('email', sa.String(300), nullable=True),
        sa.Column('telefone', sa.String(50), nullable=True),
        sa.Column('nucleo', sa.String(200), nullable=True),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        'org_shares',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), nullable=False, unique=True, index=True),
        sa.Column('token', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('org_shares')
    op.drop_table('org_members')
