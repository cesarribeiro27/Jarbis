"""phase2: utm tracking, dados fiscais, affiliate_payments, admin_audit_log

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
Create Date: 2026-03-17

Adiciona campos e tabelas da Fase 2:
- tenants: campos UTM (utm_source, utm_medium, utm_campaign, utm_term, utm_content)
- tenants: dados fiscais (cnpj, razao_social, inscricao_estadual, cep, logradouro,
           numero, complemento, bairro, cidade, estado)
- affiliate_payments: histórico de pagamentos de comissões a afiliados
- admin_audit_log: log de ações administrativas (quem, o quê, quando)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'm7n8o9p0q1r2'
down_revision = 'l6m7n8o9p0q1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── UTM tracking nos tenants ─────────────────────────────────────────────
    op.add_column('tenants', sa.Column('utm_source',   sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('utm_medium',   sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('utm_campaign', sa.String(200), nullable=True))
    op.add_column('tenants', sa.Column('utm_term',     sa.String(200), nullable=True))
    op.add_column('tenants', sa.Column('utm_content',  sa.String(200), nullable=True))

    # ── Dados fiscais nos tenants ─────────────────────────────────────────────
    op.add_column('tenants', sa.Column('cnpj',               sa.String(18),  nullable=True))
    op.add_column('tenants', sa.Column('razao_social',       sa.String(300), nullable=True))
    op.add_column('tenants', sa.Column('inscricao_estadual', sa.String(50),  nullable=True))
    op.add_column('tenants', sa.Column('cep',                sa.String(9),   nullable=True))
    op.add_column('tenants', sa.Column('logradouro',         sa.String(300), nullable=True))
    op.add_column('tenants', sa.Column('numero',             sa.String(20),  nullable=True))
    op.add_column('tenants', sa.Column('complemento',        sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('bairro',             sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('cidade',             sa.String(100), nullable=True))
    op.add_column('tenants', sa.Column('estado',             sa.String(2),   nullable=True))

    # Índice para consultas por canal de aquisição
    op.create_index('ix_tenants_utm_source', 'tenants', ['utm_source'])

    # ── affiliate_payments ───────────────────────────────────────────────────
    op.create_table(
        'affiliate_payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('affiliate_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('period_description', sa.String(100), nullable=False, server_default=''),
        sa.Column('note', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_by', sa.String(254), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['affiliate_id'], ['affiliates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_affiliate_payments_affiliate_id', 'affiliate_payments', ['affiliate_id'])

    # ── admin_audit_log ──────────────────────────────────────────────────────
    op.create_table(
        'admin_audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('admin_email', sa.String(254), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(100), nullable=True),
        sa.Column('entity_name', sa.String(300), nullable=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_audit_log_admin_email', 'admin_audit_log', ['admin_email'])
    op.create_index('ix_admin_audit_log_created_at',  'admin_audit_log', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_admin_audit_log_created_at',  table_name='admin_audit_log')
    op.drop_index('ix_admin_audit_log_admin_email', table_name='admin_audit_log')
    op.drop_table('admin_audit_log')

    op.drop_index('ix_affiliate_payments_affiliate_id', table_name='affiliate_payments')
    op.drop_table('affiliate_payments')

    op.drop_index('ix_tenants_utm_source', table_name='tenants')

    for col in ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'cnpj', 'razao_social', 'inscricao_estadual', 'cep', 'logradouro',
                'numero', 'complemento', 'bairro', 'cidade', 'estado']:
        op.drop_column('tenants', col)
