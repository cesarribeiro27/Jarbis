"""phase3: mrr_snapshots, canceled_at, affiliate portal fields

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-03-17 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'n8o9p0q1r2s3'
down_revision = 'm7n8o9p0q1r2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── mrr_snapshots ─────────────────────────────────────────────────────────
    op.create_table(
        'mrr_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('mrr', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('arr', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('paying_tenants', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('new_tenants', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('churned_tenants', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_unique_constraint('uq_mrr_snapshots_date', 'mrr_snapshots', ['snapshot_date'])
    op.create_index('ix_mrr_snapshots_snapshot_date', 'mrr_snapshots', ['snapshot_date'])

    # ── tenants: canceled_at ──────────────────────────────────────────────────
    op.add_column(
        'tenants',
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True,
                  comment='Data de cancelamento da assinatura')
    )

    # ── affiliates: portal fields ─────────────────────────────────────────────
    op.add_column(
        'affiliates',
        sa.Column('hashed_password', sa.String(255), nullable=True)
    )
    op.add_column(
        'affiliates',
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'affiliates',
        sa.Column('invite_token', sa.String(64), nullable=True)
    )
    op.add_column(
        'affiliates',
        sa.Column('invite_expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_affiliates_invite_token', 'affiliates', ['invite_token'])


def downgrade() -> None:
    op.drop_index('ix_affiliates_invite_token', table_name='affiliates')
    op.drop_column('affiliates', 'invite_expires_at')
    op.drop_column('affiliates', 'invite_token')
    op.drop_column('affiliates', 'last_login_at')
    op.drop_column('affiliates', 'hashed_password')

    op.drop_column('tenants', 'canceled_at')

    op.drop_index('ix_mrr_snapshots_snapshot_date', table_name='mrr_snapshots')
    op.drop_constraint('uq_mrr_snapshots_date', 'mrr_snapshots', type_='unique')
    op.drop_table('mrr_snapshots')
