"""allow copilot AI usage action

Revision ID: e4c7b92d1a60
Revises: d7f2a61c9e44
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op


revision: str = "e4c7b92d1a60"
down_revision: Union[str, Sequence[str], None] = "d7f2a61c9e44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_ai_usage_events_action", "ai_usage_events", type_="check")
    op.create_check_constraint(
        "ck_ai_usage_events_action",
        "ai_usage_events",
        "action IN ('ask', 'email_draft', 'customer_summary', 'copilot')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_ai_usage_events_action", "ai_usage_events", type_="check")
    # Preserve usage/cost audit rows while mapping the removed feature to the
    # closest action still understood by the previous application version.
    op.execute("UPDATE ai_usage_events SET action = 'ask' WHERE action = 'copilot'")
    op.create_check_constraint(
        "ck_ai_usage_events_action",
        "ai_usage_events",
        "action IN ('ask', 'email_draft', 'customer_summary')",
    )
