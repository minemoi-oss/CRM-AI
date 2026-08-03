from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    quote_id: Mapped[int] = mapped_column(
        ForeignKey("quotes.id")
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id")
    )

    quantity: Mapped[int]

    unit_price: Mapped[float] = mapped_column(
        Float
    )

    line_total: Mapped[float] = mapped_column(
        Float
    )

    quote = relationship(
        "Quote",
        back_populates="items"
    )

    product = relationship(
        "Product",
        back_populates="quote_items"
    )