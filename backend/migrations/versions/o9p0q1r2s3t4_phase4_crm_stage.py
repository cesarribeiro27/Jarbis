"""phase4: crm_stage no tenant

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-03-17 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'o9p0q1r2s3t4'
down_revision = 'n8o9p0q1r2s3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'tenants',
        sa.Column(
            'crm_stage',
            sa.String(30),
            nullable=False,
            server_default='novo',
            comment='Estágio CRM: novo | contato | demo_agendada | proposta | cliente | perdido',
        )
    )


def downgrade() -> None:
    op.drop_column('tenants', 'crm_stage')
