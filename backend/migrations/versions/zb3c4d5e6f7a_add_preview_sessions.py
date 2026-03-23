"""add preview_sessions table

Revision ID: zb3c4d5e6f7a
Revises: za2b3c4d5e6f
Create Date: 2026-03-23

Substitui o cache em memória (_PREVIEW_CACHE) por armazenamento persistente no
PostgreSQL. Isso garante que os dados do preview sobrevivam a restarts e redeploys
do Railway, corrigindo o bug onde o usuário perdia o preview ao se cadastrar.
"""
from alembic import op
import sqlalchemy as sa

revision = 'zb3c4d5e6f7a'
down_revision = 'za2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'preview_sessions',
        sa.Column('token', sa.String(64), primary_key=True),
        sa.Column('meta_json', sa.Text(), nullable=False),
        sa.Column('rows_json', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_preview_sessions_expires_at', 'preview_sessions', ['expires_at'])


def downgrade() -> None:
    op.drop_index('ix_preview_sessions_expires_at', table_name='preview_sessions')
    op.drop_table('preview_sessions')
