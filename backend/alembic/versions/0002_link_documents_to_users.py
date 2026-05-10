"""link_documents_to_users

Revision ID: 0002_link_documents_to_users
Revises: e9c6c6538289
Create Date: 2026-05-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_link_documents_to_users"
down_revision = "e9c6c6538289"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DELETE FROM documents WHERE user_id = 'dev-user'")


def downgrade() -> None:
    pass
