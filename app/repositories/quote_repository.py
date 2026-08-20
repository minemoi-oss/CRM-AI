from sqlalchemy.orm import Session

from app.models.quote import Quote
from app.models.customer import Customer


def create(db: Session, quote: Quote) -> Quote:
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def get_by_id(db: Session, quote_id: int, company_id: int) -> Quote | None:
    return db.query(Quote).join(Customer).filter(Quote.id == quote_id, Customer.company_id == company_id).first()


def get_all(db: Session, company_id: int) -> list[Quote]:
    return db.query(Quote).join(Customer).filter(Customer.company_id == company_id).all()


def update(db: Session, quote: Quote) -> Quote:
    db.commit()
    db.refresh(quote)
    return quote


def delete(db: Session, quote: Quote):
    db.delete(quote)
    db.commit()
