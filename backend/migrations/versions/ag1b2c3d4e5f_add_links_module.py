"""add links module (campaigns + short_links)

Revision ID: ag1b2c3d4e5f
Revises: zf7a8b9c0d1e
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

revision = "ag1b2c3d4e5f"
down_revision = "zf7a8b9c0d1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "link_campaigns",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_link_campaigns_tenant_id", "link_campaigns", ["tenant_id"])

    op.create_table(
        "short_links",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("campaign_id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(32), nullable=False),
        sa.Column("original_url", sa.Text(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("clicks_cached", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["campaign_id"], ["link_campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_short_links_tenant_id", "short_links", ["tenant_id"])
    op.create_index("ix_short_links_campaign_id", "short_links", ["campaign_id"])
    op.create_index("ix_short_links_slug", "short_links", ["slug"])


def downgrade() -> None:
    op.drop_table("short_links")
    op.drop_table("link_campaigns")
