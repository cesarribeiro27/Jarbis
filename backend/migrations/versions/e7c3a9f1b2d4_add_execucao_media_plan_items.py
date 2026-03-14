"""add execucao media plan items

Revision ID: e7c3a9f1b2d4
Revises: fc54f45ecfb1
Create Date: 2026-03-11

"""
from alembic import op
import sqlalchemy as sa

revision: str = 'e7c3a9f1b2d4'
down_revision: str = 'd4e8f1a2b3c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('media_plan_items', sa.Column('pi_status', sa.String(20), nullable=False, server_default='PENDENTE'))
    op.add_column('media_plan_items', sa.Column('pi_numero', sa.String(100), nullable=True))
    op.add_column('media_plan_items', sa.Column('pi_enviado_em', sa.Date(), nullable=True))
    op.add_column('media_plan_items', sa.Column('pi_confirmado_em', sa.Date(), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_formato', sa.String(200), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_dimensoes', sa.String(200), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_tipo_fechamento', sa.String(100), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_prazo_entrega', sa.Date(), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_horario_entrega', sa.String(20), nullable=True))
    op.add_column('media_plan_items', sa.Column('material_status', sa.String(20), nullable=False, server_default='PENDENTE'))
    op.add_column('media_plan_items', sa.Column('material_entregue_em', sa.Date(), nullable=True))
    op.add_column('media_plan_items', sa.Column('observacoes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('media_plan_items', 'observacoes')
    op.drop_column('media_plan_items', 'material_entregue_em')
    op.drop_column('media_plan_items', 'material_status')
    op.drop_column('media_plan_items', 'material_horario_entrega')
    op.drop_column('media_plan_items', 'material_prazo_entrega')
    op.drop_column('media_plan_items', 'material_tipo_fechamento')
    op.drop_column('media_plan_items', 'material_dimensoes')
    op.drop_column('media_plan_items', 'material_formato')
    op.drop_column('media_plan_items', 'pi_confirmado_em')
    op.drop_column('media_plan_items', 'pi_enviado_em')
    op.drop_column('media_plan_items', 'pi_numero')
    op.drop_column('media_plan_items', 'pi_status')
