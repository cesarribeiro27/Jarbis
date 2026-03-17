"""phase7: lifecycle_email_logs, nps_surveys

Revision ID: r2s3t4u5v6w7
Revises: q1r2s3t4u5v6
Create Date: 2026-03-17 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'r2s3t4u5v6w7'
down_revision = 'q1r2s3t4u5v6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── lifecycle_email_logs ───────────────────────────────────────────────────
    op.create_table(
        'lifecycle_email_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email_type', sa.String(50), nullable=False),
        sa.Column('recipient_email', sa.String(254), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_lifecycle_email_logs_tenant_id', 'lifecycle_email_logs', ['tenant_id'])
    op.create_index('ix_lifecycle_email_logs_type_tenant',
                    'lifecycle_email_logs', ['tenant_id', 'email_type'], unique=True)

    # ── nps_surveys ───────────────────────────────────────────────────────────
    op.create_table(
        'nps_surveys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_nps_surveys_tenant_id', 'nps_surveys', ['tenant_id'])
    op.create_index('ix_nps_surveys_user_id', 'nps_surveys', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_nps_surveys_user_id', table_name='nps_surveys')
    op.drop_index('ix_nps_surveys_tenant_id', table_name='nps_surveys')
    op.drop_table('nps_surveys')
    op.drop_index('ix_lifecycle_email_logs_type_tenant', table_name='lifecycle_email_logs')
    op.drop_index('ix_lifecycle_email_logs_tenant_id', table_name='lifecycle_email_logs')
    op.drop_table('lifecycle_email_logs')
