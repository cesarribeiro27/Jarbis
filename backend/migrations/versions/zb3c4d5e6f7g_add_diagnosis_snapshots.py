"""add diagnosis_snapshots table

Revision ID: zb3c4d5e6f7g
Revises: za2b3c4d5e6f
Create Date: 2026-03-22 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'zb3c4d5e6f7g'
down_revision = 'za2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'diagnosis_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('health_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('domain', sa.String(length=64), nullable=False, server_default='generic'),
        sa.Column('domain_name', sa.String(length=128), nullable=False, server_default='Genérico'),
        sa.Column('visual_insights', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('missing_blocks', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('missing_columns', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('suggestions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_diagnosis_snapshots_report_id', 'diagnosis_snapshots', ['report_id'])
    op.create_index('ix_diagnosis_snapshots_tenant_id', 'diagnosis_snapshots', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_diagnosis_snapshots_tenant_id', table_name='diagnosis_snapshots')
    op.drop_index('ix_diagnosis_snapshots_report_id', table_name='diagnosis_snapshots')
    op.drop_table('diagnosis_snapshots')
