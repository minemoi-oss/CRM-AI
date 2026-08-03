from sqlalchemy.orm import Session

from app.models.quote_item import QuoteItem
from app.repositories import (
    product_respositori,
    quote_item_repository,
    quote_repository,
)
from app.schemas.quote_item import QuoteItemCreate


def create_quote_item(
    db: Session,
    item_data: QuoteItemCreate
):

    quote = quote_repository.get_by_id(
        db,
        item_data.quote_id
    )

    if quote is None:
        raise ValueError("Devis introuvable")

    product = product_respositori.get_by_id(
        db,
        item_data.product_id
    )

    if product is None:
        raise ValueError("Produit introuvable")

    line_total = (
        product.price *
        item_data.quantity
    )

    item = QuoteItem(
        quote_id=item_data.quote_id,
        product_id=item_data.product_id,
        quantity=item_data.quantity,
        unit_price=product.price,
        line_total=line_total
    )

    quote_item_repository.create(
        db,
        item
    )

    total = sum(
        i.line_total
        for i in quote.items
    )

    quote.total = total

    quote_repository.update(
        db,
        quote
    )

    return item

def get_quote_items(
    db: Session,
):
    return quote_item_repository.get_all(db)