"""add_media_plans

Revision ID: a3f91b2c4d7e
Revises: 2252c0fb99b1
Create Date: 2026-03-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'a3f91b2c4d7e'
down_revision: Union[str, None] = '2252c0fb99b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'media_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(400), nullable=False),
        sa.Column('anunciante', sa.String(300), nullable=True),
        sa.Column('agencia', sa.String(300), nullable=True),
        sa.Column('produto', sa.String(300), nullable=True),
        sa.Column('data_inicio', sa.Date(), nullable=True),
        sa.Column('data_fim', sa.Date(), nullable=True),
        sa.Column('budget_total', sa.Float(), nullable=True),
        sa.Column('moeda', sa.String(3), nullable=False, server_default='BRL'),
        sa.Column('arquivo_nome', sa.String(500), nullable=True),
        sa.Column('arquivo_tamanho_bytes', sa.BigInteger(), nullable=True),
        sa.Column('parse_status', sa.String(20), nullable=False, server_default='OK'),
        sa.Column('parse_erros', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_media_plans_tenant_id', 'media_plans', ['tenant_id'])

    op.create_table(
        'media_plan_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('meio', sa.String(50), nullable=False),
        sa.Column('veiculo', sa.String(300), nullable=True),
        sa.Column('programa', sa.String(300), nullable=True),
        sa.Column('formato', sa.String(200), nullable=True),
        sa.Column('uf', sa.String(2), nullable=True),
        sa.Column('praca', sa.String(200), nullable=True),
        sa.Column('data_inicio', sa.Date(), nullable=True),
        sa.Column('data_fim', sa.Date(), nullable=True),
        sa.Column('custo_tabela', sa.Float(), nullable=True),
        sa.Column('desconto_pct', sa.Float(), nullable=True),
        sa.Column('custo_negociado', sa.Float(), nullable=True),
        sa.Column('custo_total', sa.Float(), nullable=True),
        sa.Column('bonificacao', sa.Float(), nullable=True),
        sa.Column('insercoes', sa.Integer(), nullable=True),
        sa.Column('grp', sa.Float(), nullable=True),
        sa.Column('trp', sa.Float(), nullable=True),
        sa.Column('audiencia_pct', sa.Float(), nullable=True),
        sa.Column('universo', sa.BigInteger(), nullable=True),
        sa.Column('impactos', sa.BigInteger(), nullable=True),
        sa.Column('cpp', sa.Float(), nullable=True),
        sa.Column('cpm', sa.Float(), nullable=True),
        sa.Column('alcance_pct', sa.Float(), nullable=True),
        sa.Column('frequencia_media', sa.Float(), nullable=True),
        sa.Column('ouvintes_por_minuto', sa.BigInteger(), nullable=True),
        sa.Column('centimetragem', sa.Float(), nullable=True),
        sa.Column('tiragem', sa.BigInteger(), nullable=True),
        sa.Column('circulacao', sa.BigInteger(), nullable=True),
        sa.Column('impressoes', sa.BigInteger(), nullable=True),
        sa.Column('cliques', sa.BigInteger(), nullable=True),
        sa.Column('ctr_pct', sa.Float(), nullable=True),
        sa.Column('cpc', sa.Float(), nullable=True),
        sa.Column('cpa', sa.Float(), nullable=True),
        sa.Column('conversoes', sa.Integer(), nullable=True),
        sa.Column('objetivo', sa.String(50), nullable=True),
        sa.Column('faces', sa.Integer(), nullable=True),
        sa.Column('municipio', sa.String(200), nullable=True),
        sa.Column('fluxo_diario', sa.BigInteger(), nullable=True),
        sa.Column('aba_origem', sa.String(100), nullable=True),
        sa.Column('linha_origem', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['media_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_media_plan_items_plan_id', 'media_plan_items', ['plan_id'])
    op.create_index('ix_media_plan_items_tenant_id', 'media_plan_items', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_media_plan_items_tenant_id', table_name='media_plan_items')
    op.drop_index('ix_media_plan_items_plan_id', table_name='media_plan_items')
    op.drop_table('media_plan_items')
    op.drop_index('ix_media_plans_tenant_id', table_name='media_plans')
    op.drop_table('media_plans')
