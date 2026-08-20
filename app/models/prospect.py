from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.customer import Customer


class Prospect(Base):
    __tablename__ = "prospects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'contacted', 'qualified', 'lost', 'converted')",
            name="ck_prospects_status",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high')",
            name="ck_prospects_priority",
        ),
        CheckConstraint(
            "(status = 'converted' AND converted_at IS NOT NULL) OR "
            "(status <> 'converted' AND converted_at IS NULL AND customer_id IS NULL)",
            name="ck_prospects_conversion_state",
        ),
        UniqueConstraint("customer_id", name="uq_prospects_customer_id"),
        Index("ix_prospects_company_status", "company_id", "status"),
        Index("ix_prospects_company_priority", "company_id", "priority"),
        Index("ix_prospects_company_email", "company_id", "email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(150), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="new",
        server_default="new",
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        server_default="medium",
    )
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )
    converted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    company: Mapped["Company"] = relationship(back_populates="prospects")
    customer: Mapped["Customer | None"] = relationship(back_populates="source_prospect")
