from datetime import datetime

from sqlalchemy import ForeignKey, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100))

    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    price: Mapped[float] = mapped_column(Float)

    stock: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime]

    updated_at: Mapped[datetime]

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id")
    )

    company = relationship(
        "Company",
        back_populates="products"
    )
    quote_items = relationship(
    "QuoteItem",
    back_populates="product"
    )