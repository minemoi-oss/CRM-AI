from sqlalchemy.orm import Session

from app.models.quote_item import QuoteItem
from app.models.user import User
from app.repositories import (
    product_respositori,
    quote_item_repository,
    quote_repository,
    service_repository,
)
from app.schemas.quote_item import QuoteItemCreate, QuoteLineCreate
from app.services.access import get_company_id


def _requires_integer_quantity(quantity: float) -> bool:
    return not float(quantity).is_integer()


def build_quote_item(
    db: Session,
    item_data: QuoteLineCreate,
    company_id: int,
    quote_id: int,
) -> QuoteItem:
    if item_data.product_id is not None:
        product = product_respositori.get_by_id(db, item_data.product_id, company_id)
        if product is None:
            raise ValueError("Produit introuvable")
        if _requires_integer_quantity(item_data.quantity):
            raise ValueError("La quantité d'un produit doit être un nombre entier.")

        unit_price = product.price
        item_name = product.name
        unit = "unit"
        product_id = product.id
        service_id = None
    else:
        service = service_repository.get_by_id(db, item_data.service_id, company_id)
        if service is None:
            raise ValueError("Service introuvable")
        if service.pricing_type == "fixed" and _requires_integer_quantity(item_data.quantity):
            raise ValueError("La quantité d'un service au forfait doit être un nombre entier.")

        unit_price = service.price
        item_name = service.name
        unit = "hour" if service.pricing_type == "hourly" else "package"
        product_id = None
        service_id = service.id

    line_total = round(float(unit_price) * float(item_data.quantity), 2)
    return QuoteItem(
        quote_id=quote_id,
        product_id=product_id,
        service_id=service_id,
        item_name=item_name,
        unit=unit,
        quantity=float(item_data.quantity),
        unit_price=float(unit_price),
        line_total=line_total,
    )


def create_quote_item(
    db: Session,
    item_data: QuoteItemCreate,
    current_user: User,
) -> QuoteItem:
    company_id = get_company_id(current_user)
    quote = quote_repository.get_by_id(db, item_data.quote_id, company_id)
    if quote is None:
        raise ValueError("Devis introuvable")
    if quote.invoice is not None:
        raise ValueError("Un devis déjà facturé ne peut plus être modifié.")

    item = build_quote_item(db, item_data, company_id, quote.id)
    db.add(item)
    quote.total = round(float(quote.total) + item.line_total, 2)
    db.commit()
    db.refresh(item)
    return item


def get_quote_items(db: Session, current_user: User) -> list[QuoteItem]:
    return quote_item_repository.get_all(db, get_company_id(current_user))
