from sqlalchemy.orm import Session

from app.models.quote_item import QuoteItem
from app.models.quote import Quote
from app.models.customer import Customer


def create(db: Session, item: QuoteItem) -> QuoteItem:
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_by_id(db: Session, item_id: int) -> QuoteItem | None:
    return db.get(QuoteItem, item_id)


def get_all(db: Session, company_id: int) -> list[QuoteItem]:
    return db.query(QuoteItem).join(Quote).join(Customer).filter(Customer.company_id == company_id).all()


def update(db: Session, item: QuoteItem) -> QuoteItem:
    db.commit()
    db.refresh(item)
    return item


def delete(db: Session, item: QuoteItem):
    db.delete(item)
    db.commit()
