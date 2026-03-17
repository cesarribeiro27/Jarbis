"""phase5: support_tickets, support_ticket_comments, nfe_documents

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-03-17 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'p0q1r2s3t4u5'
down_revision = 'o9p0q1r2s3t4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── support_tickets ───────────────────────────────────────────────────────
    op.create_table(
        'support_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('priority', sa.String(20), nullable=False, server_default='medium'),
        sa.Column('created_by', sa.String(254), nullable=False),
        sa.Column('assigned_to', sa.String(254), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_support_tickets_tenant_id', 'support_tickets', ['tenant_id'])
    op.create_index('ix_support_tickets_created_at', 'support_tickets', ['created_at'])

    # ── support_ticket_comments ───────────────────────────────────────────────
    op.create_table(
        'support_ticket_comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_email', sa.String(254), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_support_ticket_comments_ticket_id', 'support_ticket_comments', ['ticket_id'])

    # ── nfe_documents ─────────────────────────────────────────────────────────
    op.create_table(
        'nfe_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nfeio_id', sa.String(100), nullable=True),
        sa.Column('competencia', sa.String(7), nullable=False),
        sa.Column('valor', sa.Numeric(10, 2), nullable=False),
        sa.Column('descricao', sa.String(500), nullable=False, server_default='Assinatura Jarbis'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('nfe_url', sa.String(500), nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('xml_url', sa.String(500), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('issued_by', sa.String(254), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_nfe_documents_tenant_id', 'nfe_documents', ['tenant_id'])


def downgrade() -> None:
    op.drop_index('ix_nfe_documents_tenant_id', table_name='nfe_documents')
    op.drop_table('nfe_documents')
    op.drop_index('ix_support_ticket_comments_ticket_id', table_name='support_ticket_comments')
    op.drop_table('support_ticket_comments')
    op.drop_index('ix_support_tickets_created_at', table_name='support_tickets')
    op.drop_index('ix_support_tickets_tenant_id', table_name='support_tickets')
    op.drop_table('support_tickets')
