"""add fiscal fields to tenants and nf fields to invoices

Revision ID: zc4d5e6f7a8b
Revises: zb3c4d5e6f7a
Create Date: 2026-03-23

"""
from alembic import op
import sqlalchemy as sa

revision = 'zc4d5e6f7a8b'
down_revision = 'zb3c4d5e6f7a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Tenant: campos fiscais novos ──────────────────────────────────────────
    op.add_column('tenants', sa.Column('fiscal_type', sa.String(2), nullable=True, comment='Tipo de pessoa: pf (CPF) ou pj (CNPJ)'))
    op.add_column('tenants', sa.Column('cpf', sa.String(14), nullable=True, comment='CPF formatado: XXX.XXX.XXX-XX'))
    op.add_column('tenants', sa.Column('fiscal_email', sa.String(200), nullable=True, comment='Email para envio da NF-e'))
    op.add_column('tenants', sa.Column('inscricao_municipal', sa.String(50), nullable=True, comment='Inscrição Municipal para NFS-e'))

    # ── Invoice: campos de NF ─────────────────────────────────────────────────
    op.add_column('invoices', sa.Column('nf_status', sa.String(20), nullable=False, server_default='pendente', comment='pendente | emitida | dispensada | erro'))
    op.add_column('invoices', sa.Column('nf_numero', sa.String(50), nullable=True, comment='Número da NF-e emitida'))
    op.add_column('invoices', sa.Column('nf_emitida_at', sa.DateTime(timezone=True), nullable=True, comment='Data/hora de emissão'))
    op.add_column('invoices', sa.Column('nf_link', sa.Text, nullable=True, comment='URL da NF-e'))


def downgrade() -> None:
    op.drop_column('invoices', 'nf_link')
    op.drop_column('invoices', 'nf_emitida_at')
    op.drop_column('invoices', 'nf_numero')
    op.drop_column('invoices', 'nf_status')
    op.drop_column('tenants', 'inscricao_municipal')
    op.drop_column('tenants', 'fiscal_email')
    op.drop_column('tenants', 'cpf')
    op.drop_column('tenants', 'fiscal_type')
