"""add AI usage events

Revision ID: d7f2a61c9e44
Revises: a42f19d6e730
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7f2a61c9e44"
down_revision: Union[str, Sequence[str], None] = "a42f19d6e730"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("request_id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("provider", sa.String(length=30), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="started", nullable=False),
        sa.Column("input_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("output_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "estimated_cost_microusd",
            sa.BigInteger(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "reserved_cost_microusd",
            sa.BigInteger(),
            server_default="0",
            nullable=False,
        ),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "action IN ('ask', 'email_draft', 'customer_summary')",
            name="ck_ai_usage_events_action",
        ),
        sa.CheckConstraint(
            "status IN ('started', 'succeeded', 'failed')",
            name="ck_ai_usage_events_status",
        ),
        sa.CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0",
            name="ck_ai_usage_events_tokens_nonnegative",
        ),
        sa.CheckConstraint(
            "estimated_cost_microusd >= 0 AND reserved_cost_microusd >= 0",
            name="ck_ai_usage_events_cost_nonnegative",
        ),
        sa.CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_ai_usage_events_duration_nonnegative",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(
        "ix_ai_usage_events_company_created",
        "ai_usage_events",
        ["company_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_events_company_status",
        "ai_usage_events",
        ["company_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_usage_events_company_status", table_name="ai_usage_events")
    op.drop_index("ix_ai_usage_events_company_created", table_name="ai_usage_events")
    op.drop_table("ai_usage_events")
