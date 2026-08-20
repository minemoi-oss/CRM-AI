"""consolidate tenant security

Revision ID: c3a1f5d9e821
Revises: e1b14cc95864
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3a1f5d9e821"
down_revision: Union[str, Sequence[str], None] = "e1b14cc95864"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_users_username", "users", ["username"])
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_unique_constraint("uq_companies_owner_id", "companies", ["owner_id"])
    op.alter_column("companies", "owner_id", existing_type=sa.Integer(), nullable=False)

    for table_name in ("companies", "products", "services", "invoices"):
        op.alter_column(
            table_name,
            "created_at",
            existing_type=sa.DateTime(),
            server_default=sa.text("now()"),
            existing_nullable=False,
        )
        op.alter_column(
            table_name,
            "updated_at",
            existing_type=sa.DateTime(),
            server_default=sa.text("now()"),
            existing_nullable=False,
        )

    op.alter_column(
        "payments",
        "created_at",
        existing_type=sa.DateTime(),
        server_default=sa.text("now()"),
        existing_nullable=False,
    )
    op.alter_column(
        "payments",
        "paid_at",
        existing_type=sa.DateTime(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column("payments", "paid_at", existing_type=sa.DateTime(), nullable=False)
    op.alter_column("payments", "created_at", existing_type=sa.DateTime(), server_default=None)

    for table_name in ("invoices", "services", "products", "companies"):
        op.alter_column(table_name, "updated_at", existing_type=sa.DateTime(), server_default=None)
        op.alter_column(table_name, "created_at", existing_type=sa.DateTime(), server_default=None)

    op.alter_column("companies", "owner_id", existing_type=sa.Integer(), nullable=True)
    op.drop_constraint("uq_companies_owner_id", "companies", type_="unique")
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.drop_constraint("uq_users_username", "users", type_="unique")
