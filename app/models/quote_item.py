from sqlalchemy import CheckConstraint, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class QuoteItem(Base):
    __tablename__ = "quote_items"
    __table_args__ = (
        CheckConstraint(
            "(product_id IS NOT NULL AND service_id IS NULL) OR "
            "(product_id IS NULL AND service_id IS NOT NULL)",
            name="ck_quote_items_exactly_one_catalog_item",
        ),
        CheckConstraint("quantity > 0", name="ck_quote_items_quantity_positive"),
        CheckConstraint("unit_price > 0", name="ck_quote_items_unit_price_positive"),
        CheckConstraint("line_total >= 0", name="ck_quote_items_line_total_nonnegative"),
        CheckConstraint("unit IN ('unit', 'package', 'hour')", name="ck_quote_items_unit"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    quote_id: Mapped[int] = mapped_column(
        ForeignKey("quotes.id")
    )

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id"),
        nullable=True,
    )

    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id"),
        nullable=True,
    )

    item_name: Mapped[str] = mapped_column(String(100))

    unit: Mapped[str] = mapped_column(String(20))

    quantity: Mapped[float] = mapped_column(Float)

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

    service = relationship(
        "Service",
        back_populates="quote_items",
    )

    @property
    def item_type(self) -> str:
        return "product" if self.product_id is not None else "service"
