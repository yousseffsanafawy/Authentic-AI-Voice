"""merge_heads

Revision ID: 3900a78797eb
Revises: e785d7b0b08c, 0002_link_documents_to_users
Create Date: 2026-05-10 16:49:30.906982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3900a78797eb'
down_revision: Union[str, None] = ('e785d7b0b08c', '0002_link_documents_to_users')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
