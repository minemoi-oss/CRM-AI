from sqlalchemy.orm import Session

from app.models.quote import Quote
from app.repositories import quote_repository
from app.schemas.quote import QuoteCreate, QuoteCreateWithItems, QuoteUpdate
from app.models.user import User
from app.repositories import customer_repositori
from app.services.access import get_company_id
from app.services.quote_item_service import build_quote_item


def create_quote(
    db: Session,
    quote_data: QuoteCreate,
    current_user: User,
) -> Quote:

    customer = customer_repositori.get_by_id(db, quote_data.customer_id)
    if customer is None or customer.company_id != get_company_id(current_user):
        raise ValueError("Client introuvable")

    quote = Quote(
        customer_id=quote_data.customer_id,
        status="draft",
        total=0
    )

    return quote_repository.create(db, quote)


def create_quote_with_items(
    db: Session,
    quote_data: QuoteCreateWithItems,
    current_user: User,
) -> Quote:
    company_id = get_company_id(current_user)
    customer = customer_repositori.get_by_id(db, quote_data.customer_id)
    if customer is None or customer.company_id != company_id:
        raise ValueError("Client introuvable")

    quote = Quote(customer_id=quote_data.customer_id, status="draft", total=0)
    try:
        db.add(quote)
        db.flush()

        total = 0.0
        for line_data in quote_data.items:
            item = build_quote_item(db, line_data, company_id, quote.id)
            db.add(item)
            total += item.line_total

        quote.total = round(total, 2)
        db.commit()
        db.refresh(quote)
        return quote
    except Exception:
        db.rollback()
        raise


def get_quote(
    db: Session,
    quote_id: int,
    current_user: User,
) -> Quote:

    quote = quote_repository.get_by_id(db, quote_id, get_company_id(current_user))

    if quote is None:
        raise ValueError("Devis introuvable")

    return quote


def get_quotes(
    db: Session,
    current_user: User,
) -> list[Quote]:

    return quote_repository.get_all(db, get_company_id(current_user))


def update_quote(
    db: Session,
    quote_id: int,
    quote_data: QuoteUpdate,
    current_user: User,
) -> Quote:

    company_id = get_company_id(current_user)
    quote = quote_repository.get_by_id(db, quote_id, company_id)

    if quote is None:
        raise ValueError("Devis introuvable")

    customer = customer_repositori.get_by_id(db, quote_data.customer_id)
    if customer is None or customer.company_id != company_id:
        raise ValueError("Client introuvable")

    quote.customer_id = quote_data.customer_id
    quote.status = quote_data.status

    return quote_repository.update(db, quote)


def delete_quote(
    db: Session,
    quote_id: int,
    current_user: User,
):

    quote = quote_repository.get_by_id(db, quote_id, get_company_id(current_user))

    if quote is None:
        raise ValueError("Devis introuvable")

    quote_repository.delete(db, quote)
