"""add default to created_at and updated_at

Revision ID: 6cb176973efc
Revises: b82beaf33379
Create Date: 2026-08-02 12:49:27.421367

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6cb176973efc'
down_revision: Union[str, Sequence[str], None] = 'b82beaf33379'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('customers', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               server_default=sa.text('now()'),
               existing_nullable=False)
    op.alter_column('customers', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               server_default=sa.text('now()'),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('customers', 'updated_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               server_default=None,
               existing_nullable=False)
    op.alter_column('customers', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               server_default=None,
               existing_nullable=False)