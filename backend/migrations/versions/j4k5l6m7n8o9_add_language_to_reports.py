"""add language to reports

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-03-16 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'reports',
        sa.Column(
            'language',
            sa.String(10),
            nullable=False,
            server_default='pt-BR',
            comment='Idioma padrão do link público (ex: pt-BR, en, es)',
        ),
    )


def downgrade() -> None:
    op.drop_column('reports', 'language')
