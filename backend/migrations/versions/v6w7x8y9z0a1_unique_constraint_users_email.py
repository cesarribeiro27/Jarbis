"""add unique constraint on users.email

Revision ID: v6w7x8y9z0a1
Revises: u5v6w7x8y9z0
Create Date: 2026-03-18

"""
from alembic import op

revision = 'v6w7x8y9z0a1'
down_revision = 'u5v6w7x8y9z0'
branch_labels = None
depends_on = None


def upgrade():
    # Cria unique constraint no email dos usuários (caso não exista ainda)
    op.create_unique_constraint(
        'uq_users_email',
        'users',
        ['email']
    )


def downgrade():
    op.drop_constraint('uq_users_email', 'users', type_='unique')
