"""phase8: user_notifications, tenant_webhooks, white-label fields

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
Create Date: 2026-03-17 22:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 's3t4u5v6w7x8'
down_revision = 'r2s3t4u5v6w7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── user_notifications ────────────────────────────────────────────────────
    op.create_table(
        'user_notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False, server_default=''),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_user_notifications_user_id', 'user_notifications', ['user_id'])
    op.create_index('ix_user_notifications_created_at', 'user_notifications', ['created_at'])

    # ── tenant_webhooks ───────────────────────────────────────────────────────
    op.create_table(
        'tenant_webhooks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('events', sa.String(300), nullable=False, server_default='alert.triggered'),
        sa.Column('secret', sa.String(64), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_triggered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_status_code', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.String(254), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tenant_webhooks_tenant_id', 'tenant_webhooks', ['tenant_id'])

    # ── white-label fields on tenants ─────────────────────────────────────────
    op.add_column('tenants', sa.Column('custom_logo_url', sa.String(500), nullable=True))
    op.add_column('tenants', sa.Column('primary_color', sa.String(7), nullable=True))

    # ── digest_sent_at on mrr_snapshots ───────────────────────────────────────
    op.add_column('mrr_snapshots', sa.Column('digest_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('mrr_snapshots', 'digest_sent_at')
    op.drop_column('tenants', 'primary_color')
    op.drop_column('tenants', 'custom_logo_url')
    op.drop_index('ix_tenant_webhooks_tenant_id', table_name='tenant_webhooks')
    op.drop_table('tenant_webhooks')
    op.drop_index('ix_user_notifications_created_at', table_name='user_notifications')
    op.drop_index('ix_user_notifications_user_id', table_name='user_notifications')
    op.drop_table('user_notifications')
