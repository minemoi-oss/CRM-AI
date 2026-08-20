from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Float, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("pricing_type IN ('fixed', 'hourly')", name="ck_services_pricing_type"),
        CheckConstraint("price > 0", name="ck_services_price_positive"),
        CheckConstraint("duration IS NULL OR duration > 0", name="ck_services_duration_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100))

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    pricing_type: Mapped[str] = mapped_column(
        String(20),
        default="fixed",
        server_default="fixed",
    )

    price: Mapped[float] = mapped_column(Float)

    duration: Mapped[int | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id")
    )

    company = relationship(
        "Company",
        back_populates="services"
    )

    quote_items = relationship(
        "QuoteItem",
        back_populates="service",
    )
