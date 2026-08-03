from datetime import datetime

from sqlalchemy import ForeignKey, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)

    invoice_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="Draft",
    )

    total: Mapped[float] = mapped_column(
        Float,
        default=0,
    )

    created_at: Mapped[datetime]

    updated_at: Mapped[datetime]

    quote_id: Mapped[int] = mapped_column(
        ForeignKey("quotes.id"),
        unique=True,
    )

    quote = relationship(
        "Quote",
        back_populates="invoice",
    )

    payments = relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan",
    )