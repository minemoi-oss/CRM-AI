from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)

    amount: Mapped[float] = mapped_column(Float)

    payment_method: Mapped[str] = mapped_column(
        String(50),
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="Pending",
    )

    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id"),
    )

    invoice = relationship(
        "Invoice",
        back_populates="payments",
    )
