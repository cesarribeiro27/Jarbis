"""add affiliates table and affiliate_code to tenants

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-03-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'k5l6m7n8o9p0'
down_revision = 'j4k5l6m7n8o9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabela de afiliados
    op.create_table(
        'affiliates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('email', sa.String(254), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('commission_percent', sa.Numeric(5, 2), nullable=False, server_default='0.00'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_affiliates_code', 'affiliates', ['code'])

    # Campo affiliate_code na tabela tenants
    op.add_column(
        'tenants',
        sa.Column('affiliate_code', sa.String(50), nullable=True,
                  comment='Código do afiliado que indicou este tenant')
    )


def downgrade() -> None:
    op.drop_column('tenants', 'affiliate_code')
    op.drop_index('ix_affiliates_code', table_name='affiliates')
    op.drop_table('affiliates')
