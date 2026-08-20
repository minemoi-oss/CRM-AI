from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AIUsageEvent(Base):
    """PII-free audit and cost record for one generated AI response.

    Prompts, CRM context and model responses intentionally never enter this
    table. ``request_id`` is safe to expose to clients for support correlation.
    """

    __tablename__ = "ai_usage_events"
    __table_args__ = (
        CheckConstraint(
            "action IN ('ask', 'email_draft', 'customer_summary', 'copilot')",
            name="ck_ai_usage_events_action",
        ),
        CheckConstraint(
            "status IN ('started', 'succeeded', 'failed')",
            name="ck_ai_usage_events_status",
        ),
        CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0",
            name="ck_ai_usage_events_tokens_nonnegative",
        ),
        CheckConstraint(
            "estimated_cost_microusd >= 0 AND reserved_cost_microusd >= 0",
            name="ck_ai_usage_events_cost_nonnegative",
        ),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="ck_ai_usage_events_duration_nonnegative",
        ),
        Index("ix_ai_usage_events_company_created", "company_id", "created_at"),
        Index("ix_ai_usage_events_company_status", "company_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        unique=True,
        default=lambda: str(uuid4()),
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="started",
        server_default="started",
    )
    input_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    output_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    estimated_cost_microusd: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
        server_default="0",
    )
    reserved_cost_microusd: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
        server_default="0",
    )
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
