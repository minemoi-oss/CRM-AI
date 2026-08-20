"""create prospects

Revision ID: d91e6c4a2f80
Revises: f4b8c21a9d73
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d91e6c4a2f80"
down_revision: Union[str, Sequence[str], None] = "f4b8c21a9d73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prospects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=50), nullable=False),
        sa.Column("last_name", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("organization", sa.String(length=150), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'new'"),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.String(length=20),
            server_default=sa.text("'medium'"),
            nullable=False,
        ),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('new', 'contacted', 'qualified', 'lost', 'converted')",
            name="ck_prospects_status",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'medium', 'high')",
            name="ck_prospects_priority",
        ),
        sa.CheckConstraint(
            "(status = 'converted' AND converted_at IS NOT NULL) OR "
            "(status <> 'converted' AND converted_at IS NULL AND customer_id IS NULL)",
            name="ck_prospects_conversion_state",
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name="fk_prospects_company_id_companies",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_prospects_customer_id_customers",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_prospects"),
        sa.UniqueConstraint("customer_id", name="uq_prospects_customer_id"),
    )
    op.create_index(
        "ix_prospects_company_status",
        "prospects",
        ["company_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_prospects_company_priority",
        "prospects",
        ["company_id", "priority"],
        unique=False,
    )
    op.create_index(
        "ix_prospects_company_email",
        "prospects",
        ["company_id", "email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_prospects_company_email", table_name="prospects")
    op.drop_index("ix_prospects_company_priority", table_name="prospects")
    op.drop_index("ix_prospects_company_status", table_name="prospects")
    op.drop_table("prospects")
