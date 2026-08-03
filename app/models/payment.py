from datetime import datetime

from sqlalchemy import ForeignKey, Float, String
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

    paid_at: Mapped[datetime]

    created_at: Mapped[datetime]

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id"),
    )

    invoice = relationship(
        "Invoice",
        back_populates="payments",
    )