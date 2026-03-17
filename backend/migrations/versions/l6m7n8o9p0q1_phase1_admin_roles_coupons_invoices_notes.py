"""phase1: admin_users, coupons, invoices, tenant_notes

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-03-17

Adiciona as tabelas da Fase 1:
- admin_users: equipe interna com roles (full, vendas, financeiro, marketing, suporte)
- coupons: cupons de desconto percentual ou valor fixo
- invoices: histórico de cobranças recebidas via Stripe webhook
- tenant_notes: notas internas por tenant (CRM básico)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'l6m7n8o9p0q1'
down_revision = 'k5l6m7n8o9p0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── admin_users ──────────────────────────────────────────────────────────
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(254), nullable=False),
        sa.Column('role', sa.String(30), nullable=False, server_default='suporte'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_by', sa.String(254), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_admin_users_email', 'admin_users', ['email'])

    # ── coupons ──────────────────────────────────────────────────────────────
    op.create_table(
        'coupons',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('description', sa.String(500), nullable=False, server_default=''),
        sa.Column('discount_type', sa.String(10), nullable=False, server_default='percent'),
        sa.Column('discount_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('applicable_plans', sa.String(200), nullable=False, server_default='all'),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('stripe_coupon_id', sa.String(100), nullable=True),
        sa.Column('stripe_promo_code_id', sa.String(100), nullable=True),
        sa.Column('created_by', sa.String(254), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_coupons_code', 'coupons', ['code'])

    # ── invoices ─────────────────────────────────────────────────────────────
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stripe_invoice_id', sa.String(100), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='brl'),
        sa.Column('status', sa.String(30), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invoice_pdf', sa.Text(), nullable=True),
        sa.Column('plan', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_invoice_id'),
    )
    op.create_index('ix_invoices_tenant_id', 'invoices', ['tenant_id'])
    op.create_index('ix_invoices_stripe_invoice_id', 'invoices', ['stripe_invoice_id'])

    # ── tenant_notes ─────────────────────────────────────────────────────────
    op.create_table(
        'tenant_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('admin_email', sa.String(254), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tenant_notes_tenant_id', 'tenant_notes', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_tenant_notes_tenant_id', table_name='tenant_notes')
    op.drop_table('tenant_notes')

    op.drop_index('ix_invoices_stripe_invoice_id', table_name='invoices')
    op.drop_index('ix_invoices_tenant_id', table_name='invoices')
    op.drop_table('invoices')

    op.drop_index('ix_coupons_code', table_name='coupons')
    op.drop_table('coupons')

    op.drop_index('ix_admin_users_email', table_name='admin_users')
    op.drop_table('admin_users')
