from datetime import datetime
from datetime import timedelta

from sqlalchemy import DateTime, ForeignKey, Float, String, func
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

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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

    @property
    def customer_name(self) -> str:
        customer = self.quote.customer
        return f"{customer.first_name} {customer.last_name}"

    @property
    def payment_method(self) -> str | None:
        return self.payments[-1].payment_method if self.payments else None

    @property
    def due_date(self) -> datetime:
        return self.created_at + timedelta(days=30)
