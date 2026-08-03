from sqlalchemy.orm import Session

from app.models.quote import Quote
from app.repositories import quote_repository
from app.schemas.quote import QuoteCreate, QuoteUpdate


def create_quote(
    db: Session,
    quote_data: QuoteCreate
) -> Quote:

    quote = Quote(
        customer_id=quote_data.customer_id,
        status="draft",
        total=0
    )

    return quote_repository.create(db, quote)


def get_quote(
    db: Session,
    quote_id: int
) -> Quote:

    quote = quote_repository.get_by_id(db, quote_id)

    if quote is None:
        raise ValueError("Devis introuvable")

    return quote


def get_quotes(
    db: Session
) -> list[Quote]:

    return quote_repository.get_all(db)


def update_quote(
    db: Session,
    quote_id: int,
    quote_data: QuoteUpdate
) -> Quote:

    quote = quote_repository.get_by_id(db, quote_id)

    if quote is None:
        raise ValueError("Devis introuvable")

    quote.customer_id = quote_data.customer_id
    quote.status = quote_data.status

    return quote_repository.update(db, quote)


def delete_quote(
    db: Session,
    quote_id: int
):

    quote = quote_repository.get_by_id(db, quote_id)

    if quote is None:
        raise ValueError("Devis introuvable")

    quote_repository.delete(db, quote)